import { z } from "zod";
export const logoutAllSchema = z.object({
    user_id: z.string().uuid(),
});
