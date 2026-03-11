import { Hono } from "hono";
import { loginController } from "../controllers/loginController.js";

const loginRoute = new Hono();

loginRoute.post("/login", loginController);

export default loginRoute;
