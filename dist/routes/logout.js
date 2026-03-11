import { Hono } from "hono";
import logoutController from "../controllers/logoutController.js";
const logoutRoute = new Hono();
logoutRoute.post("/logout", logoutController);
export default logoutRoute;
