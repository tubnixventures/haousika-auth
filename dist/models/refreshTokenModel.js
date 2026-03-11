import { z } from "zod";
export const refreshTokenSchema = z.object({
    session_id: z.string().uuid("Invalid session ID"),
});
