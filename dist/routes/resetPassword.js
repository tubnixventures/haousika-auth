import { Hono } from "hono";
import { resetPasswordController } from "../controllers/resetPasswordController.js";
const resetPasswordRoute = new Hono();
resetPasswordRoute.post("/reset-password", resetPasswordController);
export default resetPasswordRoute;
