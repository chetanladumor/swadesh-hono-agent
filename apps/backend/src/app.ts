import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { errorHandler } from "./middlewares/errorHandler.js";
import { createRateLimiter } from "./middlewares/rateLimiter.js";
import { authMiddleware } from "./middlewares/auth.middleware.js";
import { chatRoutes } from "./routes/chat.routes.js";
import { agentRoutes } from "./routes/agent.routes.js";
import { healthRoutes } from "./routes/health.routes.js";
import { userRoutes } from "./routes/user.routes.js";

export const app = new Hono();

// Global Middlewares
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "*"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-User-Id", "X-Custom-Agent"],
  })
);

// Rate Limiting Middleware (100 requests per minute per IP)
app.use("/api/*", createRateLimiter({ maxRequests: 100, windowMs: 60 * 1000 }));

// Auth Middleware for Chat Routes
app.use("/api/chat/*", authMiddleware);

// Mount Routes under /api
export const appRoutes = app
  .basePath("/api")
  .route("/", healthRoutes)
  .route("/", agentRoutes)
  .route("/", userRoutes)
  .route("/", chatRoutes);

// Global Error Handling Middleware
app.onError(errorHandler);

// Export Hono RPC AppType for frontend client
export type AppType = typeof appRoutes;
