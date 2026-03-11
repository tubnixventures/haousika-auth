// models/logoutModel.ts
import { z } from "zod";
export const logoutSchema = z.object({
    token: z.string().min(10, { message: "Token is required" })
});
