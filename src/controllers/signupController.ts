import { signupSchema } from "../models/signupModel.js";
import { hashPassword } from "../utils/bcrypt.js";
import { execute } from "../utils/db-util.js";
import { v4 as uuidv4 } from "uuid";
import { generateToken } from "../utils/jwt-util.js";
import { setSession } from "../utils/redis.js";
import { sendSignupAlert, sendVerificationCode } from "../utils/mailer.js";

/**
 * Normalize phone number to E.164 (+254...) if user entered local 07...
 */
function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  if (phone.startsWith("0")) {
    // Convert Kenyan local format to +254
    return "+254" + phone.substring(1);
  }
  return phone;
}

export async function signupController(c: any) {
  try {
    const body = await c.req.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
        hint: "Phone must be in format +2547XXXXXXXX or 07XXXXXXXX"
      }, 400);
    }

    let { email, phone_number, password, display_name, country, timezone, role } = parsed.data;

    // Normalize phone number to E.164
    phone_number = normalizePhone(phone_number);

    // Hardened role validation
    const assignedRole = role ?? "User";
    const allowedFrontendRoles = ["User", "Customer Care"];
    if (!allowedFrontendRoles.includes(assignedRole)) {
      return c.json({ error: "Invalid role assignment. Only User or Customer Care allowed at signup." }, 403);
    }

    // Check if account already exists
    const existing = await execute(
      `SELECT id FROM users WHERE email = ? OR phone_number = ?`,
      [email, phone_number]
    );

    if (existing.rows && existing.rows.length > 0) {
      return c.json({
        error: "Account already exists with this email or phone number",
        hint: "Try logging in or resetting your password"
      }, 409);
    }

    // Generate IDs and hash password
    const id = uuidv4();
    const password_hash = await hashPassword(password);

    // Generate timestamps in Node.js
    const now = new Date().toISOString();

    // Insert user record
    await execute(
      `INSERT INTO users (
         id, role, permissions, email, phone_number, password_hash,
         display_name, country, timezone, is_verified, created_at, updated_at
       )
       VALUES (?,?,?,?,?,?,?,?,?,false,?,?)`,
      [id, assignedRole, "{}", email, phone_number, password_hash, display_name, country, timezone, now, now]
    );

    // Create session + JWT
    const sessionId = uuidv4();
    const token = generateToken({ id, role: assignedRole, session_id: sessionId }, "1h");

    try {
      await setSession(`session:${sessionId}`, id, 3600);
    } catch (redisErr) {
      console.error("Redis error:", redisErr);
      return c.json({ error: "Session system unavailable. Please try again later." }, 500);
    }

    // Verification setup
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      await setSession(`verify:${id}`, otp, 600);
    } catch (redisErr) {
      console.error("Redis error (verification):", redisErr);
    }

    // Send emails
    try {
      await Promise.all([
        sendSignupAlert(email!, display_name),
        sendVerificationCode(email!, otp),
      ]);
    } catch (mailErr) {
      console.error("Mailer error:", mailErr);
      return c.json({
        message: "Signup successful, but verification email could not be sent. Please contact support.",
        user_id: id,
        role: assignedRole,
        token,
      }, 202);
    }

    return c.json({
      message: "Signup successful. You are now logged in. Check your email for verification to unlock all features.",
      user_id: id,
      role: assignedRole,
      token,
    }, 201);

  } catch (err) {
    console.error("Signup error:", err);
    return c.json({ error: "Internal server error. Please try again later." }, 500);
  }
}
