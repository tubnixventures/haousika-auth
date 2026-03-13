import { logoutAllSchema } from "../models/logoutAllModel.js";
import { redis } from "../utils/redis.js"; // raw redis client
import { USE_MEMORY, memoryStore } from "../utils/redis.js";

export async function logoutAllController(c: any) {
  try {
    const body = await c.req.json();
    const parsed = logoutAllSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.format() }, 400);
    }

    const userId: string = parsed.data.user_id;

    // Collect all session keys for this user
    const userSessionKeys: string[] = [];

    if (USE_MEMORY) {
      // For in-memory, iterate the map
      for (const [key, data] of memoryStore) {
        if (key.startsWith('session:') && data.value === userId && data.expires > Date.now()) {
          userSessionKeys.push(key);
        }
      }
    } else {
      // Use Redis SCAN
      let cursor = "0";
      do {
        const result = await redis.scan(cursor, {
          MATCH: "session:*",
          COUNT: 100,
        });
        const nextCursor = result.cursor;
        const keys = result.keys;

        for (const key of keys) {
          const value = await redis.get(key);
          if (value === userId) {
            userSessionKeys.push(key);
          }
        }

        cursor = nextCursor;
      } while (cursor !== "0");
    }

    // Delete all matching sessions
    if (userSessionKeys.length > 0) {
      if (USE_MEMORY) {
        for (const key of userSessionKeys) {
          memoryStore.delete(key);
        }
      } else {
        await (redis.del as any)(...userSessionKeys);
      }
    }

    // Record a logout timestamp for JWT revocation
    const now = Date.now().toString();
    if (USE_MEMORY) {
      memoryStore.set(`logout_all_at:${userId}`, { value: now, expires: Date.now() + 3600 * 1000 }); // 1 hour
    } else {
      await redis.set(`logout_all_at:${userId}`, now);
    }

    // ✅ Clear cookie (base domain scope)
    c.cookie("auth_token", "", {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      domain: ".housika.co.ke",   // must match the domain used when setting
      maxAge: 0,                  // expire immediately
    });

    return c.json({
      message: `Cleared ${userSessionKeys.length} session(s). All tokens issued before ${now} are now invalid.`,
    }, 200);

  } catch (err) {
    console.error("LogoutAllController error:", err);
    return c.json({ error: "Internal server error. Please try again later." }, 500);
  }
}
