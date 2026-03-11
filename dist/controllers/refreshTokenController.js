import { refreshTokenSchema } from "../models/refreshTokenModel.js";
import { getSession, setSession } from "../utils/redis.js";
import { generateToken } from "../utils/jwt-util.js";
import { v4 as uuidv4 } from "uuid";
export async function refreshTokenController(c) {
    try {
        const body = await c.req.json();
        const parsed = refreshTokenSchema.safeParse(body);
        if (!parsed.success) {
            return c.json({
                error: "Validation failed",
                details: parsed.error.flatten().fieldErrors,
                hint: "Provide a valid session_id (UUID)"
            }, 400);
        }
        const { session_id } = parsed.data;
        // Look up user ID from Redis session
        const userId = await getSession(`session:${session_id}`);
        if (!userId) {
            return c.json({ error: "Session expired or invalid" }, 401);
        }
        // Generate a new session + JWT
        const newSessionId = uuidv4();
        const token = generateToken({
            id: userId,
            session_id: newSessionId,
        }, "1h");
        // Atomically replace session in Redis
        try {
            await setSession(`session:${newSessionId}`, userId, 3600);
        }
        catch (err) {
            console.error("Redis error during refresh:", err);
            return c.json({ error: "Token refresh failed. Please login again." }, 500);
        }
        // ✅ Hybrid token delivery
        // 1. Header
        c.header("Authorization", `Bearer ${token}`);
        // 2. Cookie (base domain scope)
        c.cookie("auth_token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "Strict",
            domain: ".housika.co.ke", // cookie valid for all subdomains
            maxAge: 3600,
        });
        // 3. Body
        return c.json({
            message: "Token refreshed successfully",
            token,
            user_id: userId,
            session_id: newSessionId,
        }, 200);
    }
    catch (err) {
        console.error("RefreshTokenController error:", err);
        return c.json({ error: "Internal server error. Please try again later." }, 500);
    }
}
