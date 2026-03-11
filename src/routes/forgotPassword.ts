import { Hono } from "hono";
import { forgotPasswordController } from "../controllers/forgotPasswordController.js";

const forgotPasswordRoute = new Hono();

forgotPasswordRoute.post("/forgot-password", forgotPasswordController);

export default forgotPasswordRoute;
