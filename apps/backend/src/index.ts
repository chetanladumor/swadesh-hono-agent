import { serve } from "@hono/node-server";
import { app } from "./app.js";
import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT) || 3001;

console.log(`🚀 Server starting on http://localhost:${port}...`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`✅ Swadesh AI Multi-Agent API is running on http://localhost:${port}`);
console.log(`📖 Health Check: http://localhost:${port}/api/health`);
console.log(`🤖 Agents Directory: http://localhost:${port}/api/agents`);
