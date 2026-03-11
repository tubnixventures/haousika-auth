import { Hono } from "hono";
import { logoutAllController } from "../controllers/logoutAllController.js";
const logoutAllRoute = new Hono();
logoutAllRoute.post("/logout-all", logoutAllController);
export default logoutAllRoute;
