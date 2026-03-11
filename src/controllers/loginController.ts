// controllers/loginController.ts
import { loginSchema } from "../models/loginModel.js";
import { comparePassword } from "../utils/bcrypt.js";
import { execute } from "../utils/db-util.js";
import { generateToken } from "../utils/jwt-util.js";
import { setSession } from "../utils/redis.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Normalize phone number to E.164 (+254...) if user entered local 07...
 */
function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  if (phone.startsWith("0")) {
    return "+254" + phone.substring(1);
  }
  return phone;
}

export async function loginController(c: any) {
  try {
    // Parse and validate input
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

    // Normalize phone number before lookup
    phone_number = normalizePhone(phone_number);
    const identifier = email ?? phone_number;

    // Fetch user (SQLite/libsql uses ? placeholders)
    const result = await execute(
      `SELECT * FROM users WHERE email = ? OR phone_number = ? LIMIT 1`,
      [identifier, identifier]
    );

    const user = result.rows?.[0];
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Verify password
    const valid = await comparePassword(password, String(user.password_hash));
    if (!valid) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    // Generate session + JWT
    const sessionId = uuidv4();
    const token = generateToken({
      id: String(user.id),
      role: String(user.role),
      session_id: sessionId,
    }, "1h");

    // Store session in Redis + update last_login
    try {
      const now = new Date().toISOString();
      await Promise.all([
        setSession(`session:${sessionId}`, String(user.id), 3600),
        execute(`UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?`, [now, now, String(user.id)]),
      ]);
    } catch (err) {
      console.error("Session/DB update error:", err);
      return c.json({
        message: "Login successful, but session persistence failed. Please re-login if issues occur.",
        token,
        role: user.role,
        user_id: user.id,
      }, 202);
    }

    // Success response
    return c.json({
      message: "Login successful",
      token,
      role: user.role,
      user_id: user.id,
    }, 200);

  } catch (err) {
    console.error("LoginController error:", err);
    return c.json({ error: "Internal server error. Please try again later." }, 500);
  }
}
