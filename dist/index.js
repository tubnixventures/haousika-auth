import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
// Import routes
import signup from "./routes/signup.js";
import login from "./routes/login.js";
import forgotPassword from "./routes/forgotPassword.js";
import resetPassword from "./routes/resetPassword.js";
import currentUser from "./routes/currentUser.js";
import logout from "./routes/logout.js";
import logoutAll from "./routes/logoutAll.js";
import verifyAccount from "./routes/verifyAccount.js";
import refreshToken from "./routes/refreshToken.js"; // new route
const app = new Hono();
// ✅ Global CORS middleware
app.use("*", cors({
    origin: (origin, c) => {
        if (!origin)
            return "https://housika.co.ke";
        if (origin.includes("localhost") ||
            origin.includes("127.0.0.1") ||
            origin.includes("0.0.0.0")) {
            return origin;
        }
        const allowed = ["https://housika.co.ke"];
        return allowed.includes(origin) ? origin : "https://housika.co.ke";
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));
// ✅ Health & readiness endpoints
app.get("/", (c) => c.text("Housika Auth Backend is running 🚀"));
app.get("/health", (c) => c.json({ status: "ok", uptime: process.uptime() }));
app.get("/ready", async (c) => {
    try {
        // Example: check DB + Redis connectivity
        // await db.ping();
        // await redis.ping();
        return c.json({ status: "ready" });
    }
    catch (err) {
        return c.json({ status: "not ready", error: String(err) }, 503);
    }
});
// ✅ Auth routes
app.route("/auth", signup);
app.route("/auth", login);
app.route("/auth", forgotPassword);
app.route("/auth", resetPassword);
app.route("/auth", currentUser);
app.route("/auth", logout);
app.route("/auth", logoutAll);
app.route("/auth", verifyAccount);
app.route("/auth", refreshToken);
// ✅ Catch non-existent routes
app.notFound((c) => c.json({
    error: "Route not found",
    path: c.req.path,
    method: c.req.method,
}, 404));
// ✅ Global error handler
app.onError((err, c) => {
    console.error(`[${new Date().toISOString()}] Unhandled Error:`, err);
    return c.json({ error: "Internal Server Error" }, 500);
});
// ✅ Start server
serve({
    fetch: app.fetch,
    port: Number(process.env.PORT) || 3000,
}, (info) => {
    console.log(`✅ Server running at http://localhost:${info.port}`);
});
// ✅ Graceful shutdown
["SIGINT", "SIGTERM"].forEach((signal) => {
    process.on(signal, () => {
        console.log(`Received ${signal}. Shutting down gracefully...`);
        process.exit(0);
    });
});
