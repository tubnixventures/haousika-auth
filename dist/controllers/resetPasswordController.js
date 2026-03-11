import { resetPasswordSchema } from "../models/resetPasswordModel.js";
import { hashPassword } from "../utils/bcrypt.js";
import { db } from "../utils/db-util.js"; // upgraded: transaction-capable client
import { verifyToken } from "../utils/jwt-util.js";
import { getSession, deleteSession } from "../utils/redis.js";
export async function resetPasswordController(c) {
    const body = await c.req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({
            error: "Validation failed",
            details: parsed.error.flatten().fieldErrors,
            hint: "Provide either a valid token OR reset_id + otp with new_password"
        }, 400);
    }
    const data = parsed.data;
    let targetUserId = null;
    let resetKey = null;
    // --- Case 1: Token-based reset ---
    if ("token" in data) {
        const tokenData = data;
        try {
            const payload = verifyToken(tokenData.token);
            targetUserId = String(payload.id);
            resetKey = `reset:${payload.reset_id}:otp`;
        }
        catch (err) {
            console.error("Token verification error:", err);
            return c.json({ error: "Invalid or expired token" }, 401);
        }
    }
    // --- Case 2: OTP-based reset ---
    else if ("reset_id" in data && "otp" in data) {
        const otpData = data;
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
        resetKey = `reset:${otpData.reset_id}:otp`;
    }
    if (!targetUserId) {
        return c.json({
            error: "You must provide either a valid token OR reset_id + otp with new_password"
        }, 400);
    }
    const client = await db.getClient();
    try {
        await client.beginTransaction();
        // Hash new password
        const newHash = await hashPassword(data.new_password);
        // Update user password
        const result = await client.execute(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, [newHash, new Date().toISOString(), targetUserId]);
        if (!result || (result.rowsAffected !== undefined && result.rowsAffected < 1)) {
            await client.rollback();
            return c.json({ error: "Password update failed" }, 500);
        }
        // Redis cleanup (must succeed before commit)
        if (resetKey) {
            await deleteSession(resetKey);
            if ("reset_id" in data) {
                await deleteSession(`reset:${data.reset_id}:user`);
            }
        }
        await client.commit();
        return c.json({ message: "Password reset successful" }, 200);
    }
    catch (err) {
        await client.rollback();
        console.error("ResetPasswordController atomic failure:", err);
        return c.json({ error: "Password reset failed, rolled back. Please try again." }, 500);
    }
    finally {
        client.release();
    }
}
