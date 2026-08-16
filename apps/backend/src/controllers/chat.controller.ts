import type { Context } from "hono";
import { ChatService } from "../services/chat.service.js";
import { ApiError } from "../middlewares/errorHandler.js";
import type { SendMessageRequest } from "@swadesh/shared";

export class ChatController {
  static async listConversations(c: Context) {
    const authUser = c.get("user");
    const userId = authUser ? authUser.id : (c.req.query("userId") || "user_chetan_1");
    const conversations = await ChatService.listUserConversations(userId);
    return c.json({ success: true, data: conversations });
  }

  static async getConversation(c: Context) {
    const id = c.req.param("id");
    if (!id) {
      throw new ApiError(400, "Conversation ID is required.");
    }
    const authUser = c.get("user");
    const conversation = await ChatService.getConversationById(id, authUser?.id);
    return c.json({ success: true, data: conversation });
  }

  static async deleteConversation(c: Context) {
    const id = c.req.param("id");
    if (!id) {
      throw new ApiError(400, "Conversation ID is required.");
    }
    const authUser = c.get("user");
    const result = await ChatService.deleteConversation(id, authUser?.id);
    return c.json(result);
  }

  static async sendMessage(c: Context) {
    const body = await c.req.json<SendMessageRequest>();
    if (!body || !body.content || body.content.trim() === "") {
      throw new ApiError(400, "Message content is required.");
    }

    const authUser = c.get("user");
    if (authUser) {
      body.userId = authUser.id;
    }

    const response = await ChatService.processMessage(body);
    return c.json({ success: true, data: response });
  }
}
