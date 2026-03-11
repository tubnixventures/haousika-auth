// models/signupModel.ts
import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email().optional(),
  phone_number: z.string()
    .regex(/^(\+?[1-9]\d{7,14}|0\d{9})$/, {
      message: "Phone must be in format +2547XXXXXXXX or 07XXXXXXXX"
    })
    .optional(),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
  display_name: z.string().min(2, { message: "Display name must be at least 2 characters" }),
  country: z.string(),
  timezone: z.string(),
  role: z.enum(["User", "Customer Care", "Admin", "CEO"]).optional()
}).refine(data => data.email || data.phone_number, {
  message: "Either email or phone_number is required"
});

export type SignupInput = z.infer<typeof signupSchema>;
