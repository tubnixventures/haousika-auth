import { loginSchema } from "../models/loginModel.js";
import { comparePassword } from "../utils/bcrypt.js";
import { execute } from "../utils/db-util.js";
import { generateToken } from "../utils/jwt-util.js";
import { setSession } from "../utils/redis.js";
import { v4 as uuidv4 } from "uuid";
function normalizePhone(phone) {
    if (!phone)
        return undefined;
    if (phone.startsWith("0")) {
        return "+254" + phone.substring(1);
    }
    return phone;
}
export async function loginController(c) {
    try {
        const body = await c.req.json();
        const parsed = loginSchema.safeParse(body);
        if (!parsed.success) {
            return c.json({
                error: "Validation failed",
                details: parsed.error.flatten().fieldErrors,
                hint: "Phone number must be in format +2547XXXXXXXX or 07XXXXXXXX"
            }, 400);
        }
        let { email, phone_number, password } = parsed.data;
        phone_number = normalizePhone(phone_number);
        const identifier = email ?? phone_number;
        const result = await execute(`SELECT * FROM users WHERE email = ? OR phone_number = ? LIMIT 1`, [identifier, identifier]);
        const user = result.rows?.[0];
        if (!user) {
            return c.json({ error: "User not found" }, 404);
        }
        const valid = await comparePassword(password, String(user.password_hash));
        if (!valid) {
            return c.json({ error: "Invalid credentials" }, 401);
        }
        const sessionId = uuidv4();
        const token = generateToken({
            id: String(user.id),
            role: String(user.role),
            session_id: sessionId,
        }, "1h");
        try {
            const now = new Date().toISOString();
            await Promise.all([
                setSession(`session:${sessionId}`, String(user.id), 3600),
                execute(`UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?`, [now, now, String(user.id)]),
            ]);
        }
        catch (err) {
            console.error("Session/DB update error:", err);
        }
        // ✅ Hybrid token delivery
        // 1. Header
        c.header("Authorization", `Bearer ${token}`);
        // 2. Cookie (base domain scope)
        c.cookie("auth_token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "Strict",
            domain: ".housika.co.ke", // <-- critical: cookie valid for all subdomains
            maxAge: 3600,
        });
        // 3. Body
        return c.json({
            message: "Login successful",
            token,
            role: user.role,
            user_id: user.id,
        }, 200);
    }
    catch (err) {
        console.error("LoginController error:", err);
        return c.json({ error: "Internal server error. Please try again later." }, 500);
    }
}
