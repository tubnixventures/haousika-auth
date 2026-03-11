import { resetPasswordSchema } from "../models/resetPasswordModel.js";
import type {
  TokenResetInput,
  OtpResetInput,
  ResetPasswordInput
} from "../models/resetPasswordModel.js"; // <-- type-only import

import { hashPassword } from "../utils/bcrypt.js";
import { execute } from "../utils/db-util.js";
import { verifyToken } from "../utils/jwt-util.js";
import { getSession, deleteSession } from "../utils/redis.js";

export async function resetPasswordController(c: any) {
  try {
    const body = await c.req.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
        hint: "Provide either a valid token OR reset_id + otp with new_password"
      }, 400);
    }

    const data: ResetPasswordInput = parsed.data;
    let targetUserId: string | null = null;
    let resetKey: string | null = null;

    // --- Case 1: Token-based reset ---
    if ("token" in data) {
      const tokenData = data as TokenResetInput;
      try {
        const payload = verifyToken<{ id: string; reset_id: string }>(tokenData.token);
        targetUserId = String(payload.id);
        resetKey = `reset:${payload.reset_id}:otp`;
      } catch (err) {
        console.error("Token verification error:", err);
        return c.json({ error: "Invalid or expired token" }, 401);
      }
    }

    // --- Case 2: OTP-based reset ---
    else if ("reset_id" in data && "otp" in data) {
      const otpData = data as OtpResetInput;
      const storedOtpRaw = await getSession(`reset:${otpData.reset_id}:otp`);

      if (!storedOtpRaw) {
        console.error(`No OTP found in Redis for reset_id=${otpData.reset_id}`);
        return c.json({ error: "Invalid or expired OTP" }, 401);
      }

      const storedOtp = String(storedOtpRaw).trim();
      const providedOtp = String(otpData.otp).trim();

      if (storedOtp !== providedOtp) {
        console.error(`OTP mismatch: stored=${storedOtp}, provided=${providedOtp}`);
        return c.json({ error: "Invalid or expired OTP" }, 401);
      }

      const storedUserIdRaw = await getSession(`reset:${otpData.reset_id}:user`);
      if (!storedUserIdRaw) {
        console.error(`No userId found in Redis for reset_id=${otpData.reset_id}`);
        return c.json({ error: "Reset session expired" }, 401);
      }

      targetUserId = String(storedUserIdRaw);
      resetKey = `reset:${otpData.reset_id}:otp`;
    }

    if (!targetUserId) {
      return c.json({
        error: "You must provide either a valid token OR reset_id + otp with new_password"
      }, 400);
    }

    // Hash new password
    const newHash = await hashPassword(data.new_password);

    // Update user password
    const result = await execute(
      `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`,
      [newHash, new Date().toISOString(), targetUserId]
    );

    // Check rows affected
    if (!result || (result.rowsAffected !== undefined && result.rowsAffected < 1)) {
      console.error(`Password update failed for userId=${targetUserId}`);
      return c.json({ error: "Password update failed" }, 500);
    }

    // Clean up Redis keys
    if (resetKey) {
      await deleteSession(resetKey).catch(err => console.error("Redis cleanup error:", err));
      if ("reset_id" in data) {
        await deleteSession(`reset:${data.reset_id}:user`).catch(err => console.error("Redis cleanup error:", err));
      }
    }

    return c.json({ message: "Password reset successful" }, 200);

  } catch (err) {
    console.error("ResetPasswordController error:", err);
    return c.json({ error: "Internal server error. Please try again later." }, 500);
  }
}
