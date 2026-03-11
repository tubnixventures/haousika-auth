import { z } from "zod";

export const refreshTokenSchema = z.object({
  session_id: z.string().uuid("Invalid session ID"),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
