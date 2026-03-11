import { forgotPasswordSchema } from "../models/forgotPasswordModel.js";
import { execute } from "../utils/db-util.js";
import { generateToken } from "../utils/jwt-util.js";
import { setSession } from "../utils/redis.js";
import { v4 as uuidv4 } from "uuid";
import { sendResetEmail } from "../utils/mailer.js";

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

// Simple numeric OTP generator
function generateOTP(length = 6): string {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

export async function forgotPasswordController(c: any) {
  try {
    let body;
    try {
      body = await c.req.json();
    } catch (parseErr) {
      return c.json({
        error: "Invalid JSON format",
        hint: "Ensure request body is valid JSON with double-quoted property names and values"
      }, 400);
    }

    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
        hint: "Phone number must be in format +2547XXXXXXXX or 07XXXXXXXX"
      }, 400);
    }

    let { email, phone_number } = parsed.data;
    phone_number = normalizePhone(phone_number);
    const identifier = email ?? phone_number;

    // Fetch user
    const result = await execute(
      `SELECT id, email, phone_number FROM users WHERE email = ? OR phone_number = ? LIMIT 1`,
      [identifier, identifier]
    );

    const user = result.rows?.[0];
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Generate reset token + OTP
    const resetId = uuidv4();
    const otp = generateOTP(6);
    const token = generateToken({ id: String(user.id), reset_id: resetId }, "10m");

    // Store OTP and user_id in Redis with short TTL (5 min)
    await setSession(`reset:${resetId}:otp`, otp, 300);
    await setSession(`reset:${resetId}:user`, String(user.id), 300);

    // Build reset link pointing to your frontend
    const resetLink = `https://www.housika.co.ke/reset-password?token=${token}&id=${resetId}`;

    // Send reset email (contains OTP + link)
    try {
      if (!user.email) {
        return c.json({
          error: "Password reset requires a registered email address. Please contact support."
        }, 400);
      }
      await sendResetEmail(String(user.email), otp, resetLink);
    } catch (mailErr) {
      console.error("Mailer error:", mailErr);
      return c.json({
        message: "Reset request created, but email could not be sent. Please contact support.",
        reset_id: resetId
      }, 202);
    }

    // ✅ Return reset_id to frontend so it can await OTP
    return c.json({
      message: "Password reset instructions have been sent to your registered email.",
      reset_id: resetId
    }, 200);

  } catch (err) {
    console.error("ForgotPasswordController error:", err);
    return c.json({ error: "Internal server error. Please try again later." }, 500);
  }
}
