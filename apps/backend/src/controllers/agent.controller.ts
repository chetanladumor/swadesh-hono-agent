import type { Context } from "hono";
import { AgentService } from "../services/agent.service.js";
import { ApiError } from "../middlewares/errorHandler.js";

export class AgentController {
  static listAgents(c: Context) {
    const agents = AgentService.getAvailableAgents();
    return c.json({ success: true, count: agents.length, data: agents });
  }

  static getCapabilities(c: Context) {
    const type = c.req.param("type");
    if (!type) {
      throw new ApiError(400, "Agent type param is required.");
    }
    const agent = AgentService.getAgentCapabilities(type);
    if (!agent) {
      throw new ApiError(404, `Agent type "${type}" not recognized. Valid types: ROUTER, SUPPORT, ORDER, BILLING, FALLBACK`);
    }
    return c.json({ success: true, data: agent });
  }
}
