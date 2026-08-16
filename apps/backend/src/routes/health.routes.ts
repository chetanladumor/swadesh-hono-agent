import { Hono } from "hono";
import { HealthController } from "../controllers/health.controller.js";

export const healthRoutes = new Hono()
  .get("/health", HealthController.getHealth);
