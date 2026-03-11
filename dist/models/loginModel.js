// models/loginModel.ts
import { z } from "zod";
export const loginSchema = z.object({
    email: z.string().email().optional(),
    phone_number: z.string()
        .regex(/^(\+?[1-9]\d{7,14}|0\d{9})$/, {
        message: "Phone number must be in format +2547XXXXXXXX or 07XXXXXXXX"
    })
        .optional(),
    password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
}).refine(data => data.email || data.phone_number, {
    message: "Either email or phone_number is required"
});
