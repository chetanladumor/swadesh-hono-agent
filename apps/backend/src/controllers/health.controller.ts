import type { Context } from "hono";
import { prisma } from "../db/prisma.js";
import type { HealthCheckResponse } from "@swadesh/shared";

export class HealthController {
  static async getHealth(c: Context) {
    let dbStatus: "connected" | "disconnected" = "connected";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "disconnected";
    }

    const response: HealthCheckResponse = {
      status: dbStatus === "connected" ? "ok" : "degraded",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbStatus,
      agentsAvailable: ["ROUTER", "SUPPORT", "ORDER", "BILLING", "FALLBACK"],
    };

    return c.json(response, dbStatus === "connected" ? 200 : 503);
  }
}
