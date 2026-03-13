import { z } from "zod";
// Token-based reset: requires token + new_password
const tokenResetSchema = z.object({
    type: z.literal("token"), // discriminator
    token: z.string().min(1, "Token is required"),
    new_password: z.string().min(8, "Password must be at least 8 characters"),
});
// OTP-based reset: requires reset_id + otp + new_password
const otpResetSchema = z.object({
    type: z.literal("otp"), // discriminator
    reset_id: z.string().uuid("Invalid reset ID"),
    otp: z.string().length(6, "OTP must be 6 digits"),
    new_password: z.string().min(8, "Password must be at least 8 characters"),
});
// Union schema: either token OR reset_id+otp
export const resetPasswordSchema = z.discriminatedUnion("type", [
    tokenResetSchema,
    otpResetSchema,
]);
