import { Hono } from "hono";
import { signupController } from "../controllers/signupController.js";

const signupRoute = new Hono();

signupRoute.post("/signup", signupController);

export default signupRoute;
