// controllers/currentUserController.ts
import { verifyToken } from "../utils/jwt-util.js";
import { getSession } from "../utils/redis.js"; // assumes you have a getSession util

export async function currentUserController(c: any) {
  try {
    // Get token from Authorization header
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Authorization header missing or invalid" }, 401);
    }

    const token = authHeader.substring(7);

    // Verify JWT
    let payload;
    try {
      payload = verifyToken<{ id: string; session_id: string; role: string }>(token);
    } catch {
      return c.json({ error: "Invalid or expired token" }, 401);
    }

    // Check Redis session
    const sessionKey = `session:${payload.session_id}`;
    const sessionUserId = await getSession(sessionKey);

    if (!sessionUserId || sessionUserId !== payload.id) {
      return c.json({ error: "Session not found or expired" }, 401);
    }

    // Return user info from token (not DB)
    return c.json({
      user: {
        id: payload.id,
        role: payload.role,
        session_id: payload.session_id
      }
    }, 200);

  } catch (err) {
    console.error("CurrentUserController error:", err);
    return c.json({ error: "Internal server error. Please try again later." }, 500);
  }
}
