import { verifyAccountSchema } from "../models/verifyAccountModel.js";
import { execute } from "../utils/db-util.js";
import { verifyToken } from "../utils/jwt-util.js";
import { getSession, deleteSession } from "../utils/redis.js";
import { sendSignupAlert } from "../utils/mailer.js"; // optional: reuse mailer for alerts

export async function verifyAccountController(c: any) {
  try {
    const body = await c.req.json();
    const parsed = verifyAccountSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
        hint: "Provide either a valid token or OTP with user_id"
      }, 400);
    }

    const data = parsed.data;

    // --- Token-based verification ---
    if ("token" in data) {
      try {
        const payload = verifyToken<{ id: string }>(data.token);

        await execute(
          `UPDATE users SET is_verified=true, updated_at=NOW() WHERE id=$1`,
          [payload.id]
        );

        // optional: send alert email
        try {
          await sendSignupAlert(undefined, "Account verified via token");
        } catch (mailErr) {
          console.error("Mailer error (token verification):", mailErr);
        }

        return c.json({
          message: "Account verified via token",
          user_id: payload.id,
          method: "token"
        }, 200);
      } catch (err) {
        console.error("Token verification error:", err);
        return c.json({
          error: "Invalid or expired token",
          hint: "Request a new verification link"
        }, 400);
      }
    }

    // --- OTP-based verification ---
    if ("user_id" in data && "otp" in data) {
      try {
        const storedOtp = await getSession(`verify:${data.user_id}`);

        if (!storedOtp) {
          return c.json({
            error: "OTP expired or not found",
            hint: "Request a new OTP"
          }, 400);
        }
        if (storedOtp !== data.otp) {
          return c.json({
            error: "Invalid OTP",
            hint: "Check the code sent to your email"
          }, 400);
        }

        await execute(
          `UPDATE users SET is_verified=true, updated_at=NOW() WHERE id=$1`,
          [data.user_id]
        );

        await deleteSession(`verify:${data.user_id}`);

        // optional: send alert email
        try {
          await sendSignupAlert(undefined, "Account verified via OTP");
        } catch (mailErr) {
          console.error("Mailer error (OTP verification):", mailErr);
        }

        return c.json({
          message: "Account verified via OTP",
          user_id: data.user_id,
          method: "otp"
        }, 200);
      } catch (err) {
        console.error("OTP verification error:", err);
        return c.json({
          error: "Verification system unavailable",
          hint: "Please try again later"
        }, 500);
      }
    }

    // --- No valid method provided ---
    return c.json({
      error: "No verification method provided",
      hint: "Include either token or user_id + otp"
    }, 400);

  } catch (err) {
    console.error("VerifyAccountController error:", err);
    return c.json({
      error: "Internal server error",
      hint: "Please try again later"
    }, 500);
  }
}
