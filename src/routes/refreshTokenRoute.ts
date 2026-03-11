import { Hono } from "hono";
import { refreshTokenController } from "../controllers/refreshTokenController.js";

const refreshTokenRoute = new Hono();

// POST /refresh-token → issues a new JWT + session
refreshTokenRoute.post("/refresh-token", refreshTokenController);

export default refreshTokenRoute;
