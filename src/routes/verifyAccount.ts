import { Hono } from "hono";
import { verifyAccountController } from "../controllers/verifyAccountController.js";

const verifyAccountRoute = new Hono();

verifyAccountRoute.post("/verify-account", verifyAccountController);

export default verifyAccountRoute;
