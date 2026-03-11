// models/userModel.ts
import { z } from "zod";

export const userSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["User", "Customer Care", "Admin", "CEO"]),
  permissions: z.string(), // stored as JSON string "{}"
  email: z.string().email().nullable(), // can be null if signup used phone
  phone_number: z.string().nullable(),
  password_hash: z.string(),
  display_name: z.string(),
  country: z.string(),
  timezone: z.string(),
  is_verified: z.boolean(),
  created_at: z.string(), // ISO timestamp
  updated_at: z.string(), // ISO timestamp
});

export type User = z.infer<typeof userSchema>;
