import { resetPasswordSchema } from "../models/resetPasswordModel.js";
import type {
  TokenResetInput,
  OtpResetInput,
  ResetPasswordInput
} from "../models/resetPasswordModel.js";

import { hashPassword } from "../utils/bcrypt.js";
import { db } from "../utils/db-util.js"; // This is your createClient instance
import { verifyToken } from "../utils/jwt-util.js";
import { getSession, deleteSession } from "../utils/redis.js";

export async function resetPasswordController(c: any) {
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
      return c.json({ error: "Invalid or expired OTP" }, 401);
    }

    const storedOtp = String(storedOtpRaw).trim();
    const providedOtp = String(otpData.otp).trim();

    if (storedOtp !== providedOtp) {
      return c.json({ error: "Invalid or expired OTP" }, 401);
    }

    const storedUserIdRaw = await getSession(`reset:${otpData.reset_id}:user`);
    if (!storedUserIdRaw) {
      return c.json({ error: "Reset session expired" }, 401);
    }

    targetUserId = String(storedUserIdRaw);
    resetKey = `reset:${otpData.reset_id}:user`; // Corrected key for logic consistency
  }

  if (!targetUserId) {
    return c.json({
      error: "You must provide either a valid token OR reset_id + otp with new_password"
    }, 400);
  }

  /**
   * ATOMIC TRANSACTION BLOCK
   * libSQL uses .transaction("write") to handle ACID compliance.
   */
  const tx = await db.transaction("write");

  try {
    // 1. Hash new password
    const newHash = await hashPassword(data.new_password);

    // 2. Update user password using the transaction client (tx)
    const result = await tx.execute({
      sql: `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`,
      args: [newHash, new Date().toISOString(), targetUserId]
    });

    if (result.rowsAffected === 0) {
      await tx.rollback();
      return c.json({ error: "User not found or update failed" }, 404);
    }

    // 3. Redis cleanup (Must succeed for the reset to be considered "finished")
    if (resetKey) {
      await deleteSession(resetKey);
      // If it was OTP-based, clean up the secondary key as well
      if ("reset_id" in data) {
        await deleteSession(`reset:${data.reset_id}:otp`);
      }
    }

    // 4. Commit all changes to the database
    await tx.commit();

    return c.json({ message: "Password reset successful" }, 200);

  } catch (err) {
    // Rollback DB if any part of the process fails
    await tx.rollback();
    console.error("ResetPasswordController atomic failure:", err);
    return c.json({ error: "Password reset failed. Please try again." }, 500);
  }
}