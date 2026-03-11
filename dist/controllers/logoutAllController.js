import { logoutAllSchema } from "../models/logoutAllModel.js";
import { redis } from "../utils/redis.js"; // raw redis client
export async function logoutAllController(c) {
    try {
        const body = await c.req.json();
        const parsed = logoutAllSchema.safeParse(body);
        if (!parsed.success) {
            return c.json({ error: parsed.error.format() }, 400);
        }
        const userId = parsed.data.user_id;
        // Collect all session keys for this user using SCAN
        const userSessionKeys = [];
        let cursor = "0";
        do {
            const [nextCursor, keys] = await redis.scan(cursor, {
                match: "session:*",
                count: 100,
            });
            for (const key of keys) {
                const value = await redis.get(key);
                if (value === userId) {
                    userSessionKeys.push(key);
                }
            }
            cursor = nextCursor;
        } while (cursor !== "0");
        // Delete all matching sessions
        if (userSessionKeys.length > 0) {
            await redis.del(...userSessionKeys);
        }
        // Record a logout timestamp for JWT revocation
        const now = Date.now().toString();
        await redis.set(`logout_all_at:${userId}`, now);
        // ✅ Clear cookie (base domain scope)
        c.cookie("auth_token", "", {
            httpOnly: true,
            secure: true,
            sameSite: "Strict",
            domain: ".housika.co.ke", // must match the domain used when setting
            maxAge: 0, // expire immediately
        });
        return c.json({
            message: `Cleared ${userSessionKeys.length} session(s). All tokens issued before ${now} are now invalid.`,
        }, 200);
    }
    catch (err) {
        console.error("LogoutAllController error:", err);
        return c.json({ error: "Internal server error. Please try again later." }, 500);
    }
}
