// models/forgotPasswordModel.ts
import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.string().email().optional(),
  phone_number: z.string()
    .regex(/^(\+?[1-9]\d{7,14}|0\d{9})$/, {
      message: "Phone number must be in format +2547XXXXXXXX or 07XXXXXXXX"
    })
    .optional(),
}).refine(data => data.email || data.phone_number, {
  message: "Either email or phone_number is required"
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
