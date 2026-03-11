import { z } from "zod";

// Union schema: either token OR user_id+otp
export const verifyAccountSchema = z.union([
  z.object({
    token: z.string().min(1, "Token is required"),
  }),
  z.object({
    user_id: z.string().uuid("Invalid user ID"),
    otp: z.string().min(4, "OTP is required"),
  }),
]);

export type VerifyAccountInput = z.infer<typeof verifyAccountSchema>;
