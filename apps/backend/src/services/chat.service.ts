import { prisma } from "../db/prisma.js";
import { RouterAgent } from "../agents/router.agent.js";
import { ApiError } from "../middlewares/errorHandler.js";
import type { AgentType, SendMessageRequest, SendMessageResponse } from "@swadesh/shared";
import { Role } from "@prisma/client";

export class ChatService {
  static async listUserConversations(userId: string) {
    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return conversations;
  }

  static async getConversationById(id: string, authenticatedUserId?: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      throw new ApiError(404, `Conversation with ID "${id}" not found.`);
    }

    // Strict multi-tenant security: ensure user only accesses their own conversations
    if (authenticatedUserId && conversation.userId !== authenticatedUserId) {
      throw new ApiError(403, "Forbidden: You do not have permission to view this customer conversation.");
    }

    return conversation;
  }

  static async deleteConversation(id: string, authenticatedUserId?: string) {
    const conversation = await prisma.conversation.findUnique({ where: { id } });
    if (!conversation) {
      throw new ApiError(404, `Conversation "${id}" not found.`);
    }

    if (authenticatedUserId && conversation.userId !== authenticatedUserId) {
      throw new ApiError(403, "Forbidden: You cannot delete another customer conversation.");
    }

    await prisma.conversation.delete({ where: { id } });
    return { success: true, message: `Conversation "${id}" deleted successfully.` };
  }

  static async processMessage(req: SendMessageRequest): Promise<SendMessageResponse> {
    const userId = req.userId || "user_chetan_1";

    // 1. Ensure user exists and load profile
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          name: "Customer",
          email: `${userId}@example.com`,
          address: "452 Innovation Way, Suite 800, San Francisco, CA 94107",
        },
      });
    }

    // 2. Ensure or create conversation strictly for this user
    let conversationId = req.conversationId;
    if (conversationId) {
      const existing = await prisma.conversation.findUnique({ where: { id: conversationId } });
      if (!existing || existing.userId !== user.id) {
        // If conversation does not belong to this user, create a fresh one
        const newConv = await prisma.conversation.create({
          data: {
            userId: user.id,
            title: req.content.slice(0, 40) + (req.content.length > 40 ? "..." : ""),
          },
        });
        conversationId = newConv.id;
      }
    } else {
      const newConv = await prisma.conversation.create({
        data: {
          userId: user.id,
          title: req.content.slice(0, 40) + (req.content.length > 40 ? "..." : ""),
        },
      });
      conversationId = newConv.id;
    }

    // 3. Save User message to database
    await prisma.message.create({
      data: {
        conversationId,
        role: Role.user,
        content: req.content,
        agentType: "ROUTER" as any,
      },
    });

    // 4. Load past conversation history
    const history = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    // 5. Execute Multi-Agent Orchestration with full user context
    const dispatchResult = await RouterAgent.routeAndExecute(
      req.content,
      history.map((m) => ({ role: m.role, content: m.content, agentType: m.agentType || undefined })),
      {
        id: user.id,
        name: user.name,
        email: user.email,
        address: user.address,
      },
      req.preferredAgent
    );

    // 6. Save Assistant response to database with reasoning and tool traces
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId,
        role: Role.assistant,
        content: dispatchResult.response,
        agentType: dispatchResult.agentType as any,
        reasoningSteps: dispatchResult.reasoningSteps as any,
        toolCalls: dispatchResult.toolCalls as any,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      conversationId,
      message: {
        id: assistantMessage.id,
        conversationId: assistantMessage.conversationId,
        role: assistantMessage.role as any,
        content: assistantMessage.content,
        agentType: assistantMessage.agentType as AgentType,
        reasoningSteps: dispatchResult.reasoningSteps,
        toolCalls: dispatchResult.toolCalls,
        createdAt: assistantMessage.createdAt.toISOString(),
      },
      agentType: dispatchResult.agentType,
      reasoningSteps: dispatchResult.reasoningSteps,
      toolCalls: dispatchResult.toolCalls,
    };
  }
}
