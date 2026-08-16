import { prisma } from "../db/prisma.js";

export interface SupportToolResult {
  success: boolean;
  message: string;
  data?: any;
}

export const supportTools = {
  getUserProfile: async (args: { userId: string }): Promise<SupportToolResult> => {
    const user = await prisma.user.findUnique({
      where: { id: args.userId },
      select: { id: true, name: true, email: true, phone: true, address: true },
    });

    if (!user) {
      return { success: false, message: `User "${args.userId}" not found.` };
    }

    return {
      success: true,
      message: `Profile found for ${user.name}.`,
      data: user,
    };
  },

  queryKnowledgeBase: async (args: { query: string; category?: string }): Promise<SupportToolResult> => {
    const articles = await prisma.knowledgeBase.findMany({
      where: args.category ? { category: args.category } : undefined,
    });

    const q = args.query.toLowerCase();
    const matches = articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        a.keywords.some((k) => q.includes(k.toLowerCase()))
    );

    if (matches.length === 0) {
      return {
        success: true,
        message: "No exact knowledge base match found. Returning general customer policy guidelines.",
        data: articles.slice(0, 2),
      };
    }

    return {
      success: true,
      message: `Found ${matches.length} relevant articles in knowledge base.`,
      data: matches,
    };
  },

  queryConversationHistory: async (args: {
    userId?: string;
    conversationId?: string;
    keyword?: string;
  }): Promise<SupportToolResult> => {
    const messages = await prisma.message.findMany({
      where: {
        conversationId: args.conversationId,
        content: args.keyword ? { contains: args.keyword, mode: "insensitive" } : undefined,
      },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    return {
      success: true,
      message: `Retrieved ${messages.length} previous messages from conversation history.`,
      data: messages.map((m) => ({
        role: m.role,
        content: m.content,
        agent: m.agentType,
        timestamp: m.createdAt.toISOString(),
      })),
    };
  },
};
