import { Hono } from "hono";
import { AgentController } from "../controllers/agent.controller.js";

export const agentRoutes = new Hono()
  .get("/agents", AgentController.listAgents)
  .get("/agents/:type/capabilities", AgentController.getCapabilities);
