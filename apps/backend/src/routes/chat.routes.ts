import { Hono } from "hono";
import { ChatController } from "../controllers/chat.controller.js";

export const chatRoutes = new Hono()
  .post("/chat/messages", ChatController.sendMessage)
  .get("/chat/conversations", ChatController.listConversations)
  .get("/chat/conversations/:id", ChatController.getConversation)
  .delete("/chat/conversations/:id", ChatController.deleteConversation);
