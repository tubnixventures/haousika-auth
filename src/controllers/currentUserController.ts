import { verifyToken } from "../utils/jwt-util.js";
import { getSession } from "../utils/redis.js";

export async function currentUserController(c: any) {
  try {
    let token: string | null = null;

    // 1. Try Authorization header
    const authHeader = c.req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    // 2. Fallback to cookie
    if (!token) {
      const cookieToken = c.req.cookie("auth_token");
      if (cookieToken) {
        token = cookieToken;
      }
    }

    if (!token) {
      return c.json({ error: "Authorization token missing (header or cookie)" }, 401);
    }

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
        session_id: payload.session_id,
      },
    }, 200);

  } catch (err) {
    console.error("CurrentUserController error:", err);
    return c.json({ error: "Internal server error. Please try again later." }, 500);
  }
}
