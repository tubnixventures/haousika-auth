// controllers/logoutController.ts
import { deleteSession } from "../utils/redis.js";
import { verifyToken } from "../utils/jwt-util.js";

export default async function logoutController(c: any) {
  try {
    // Get token from Authorization header
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Authorization header missing or invalid" }, 401);
    }

    const token = authHeader.substring(7); // strip "Bearer "

    // Verify JWT and extract session_id
    let payload;
    try {
      payload = verifyToken<{ id: string; session_id: string }>(token);
    } catch (err) {
      console.error("Token verification error:", err);
      return c.json({ error: "Invalid or expired token" }, 401);
    }

    // Delete only this session
    try {
      await deleteSession(`session:${payload.session_id}`);
    } catch (redisErr) {
      console.error("Redis error (logout):", redisErr);
      return c.json({ error: "Logout failed due to session system error" }, 500);
    }

    return c.json({ message: "Logged out from current device/session" }, 200);

  } catch (err) {
    console.error("LogoutController error:", err);
    return c.json({ error: "Internal server error. Please try again later." }, 500);
  }
}
