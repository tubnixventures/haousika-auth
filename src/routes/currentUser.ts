import { Hono } from "hono";
import { currentUserController } from "../controllers/currentUserController.js";

const currentUserRoute = new Hono();

currentUserRoute.get("/current-user", currentUserController);

export default currentUserRoute;
