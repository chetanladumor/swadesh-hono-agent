import { prisma } from "../db/prisma.js";

export interface SupportToolResult {
  success: boolean;
  message: string;
  data?: any;
}

export const supportTools = {
  queryKnowledgeBase: async (args: { query: string; category?: string }): Promise<SupportToolResult> => {
    const query = args.query.toLowerCase().trim();
    const words = query.split(/\s+/).filter((w) => w.length > 2);

    const allArticles = await prisma.knowledgeBase.findMany();

    const matches = allArticles.filter((art) => {
      const matchCategory = args.category
        ? art.category.toLowerCase().includes(args.category.toLowerCase())
        : true;

      const matchContent =
        art.title.toLowerCase().includes(query) ||
        art.content.toLowerCase().includes(query) ||
        art.keywords.some((k) => words.some((w) => k.toLowerCase().includes(w) || w.includes(k.toLowerCase())));

      return matchCategory && matchContent;
    });

    if (matches.length === 0) {
      return {
        success: false,
        message: `No specific policy article found matching "${args.query}". Providing general support guidelines.`,
        data: allArticles.map((a) => ({ title: a.title, category: a.category })),
      };
    }

    return {
      success: true,
      message: `Found ${matches.length} matching policy articles.`,
      data: matches.map((m) => ({
        title: m.title,
        category: m.category,
        content: m.content,
      })),
    };
  },

  queryConversationHistory: async (args: { userId?: string; conversationId?: string; keyword?: string }): Promise<SupportToolResult> => {
    const where: any = {};
    if (args.conversationId) where.conversationId = args.conversationId;
    if (args.userId) where.conversation = { userId: args.userId };

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: 20,
      include: { conversation: { select: { title: true, userId: true } } },
    });

    const filtered = args.keyword
      ? messages.filter((m) => m.content.toLowerCase().includes(args.keyword!.toLowerCase()))
      : messages;

    return {
      success: true,
      message: `Retrieved ${filtered.length} relevant historical messages.`,
      data: filtered.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        agent: m.agentType,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  },
};
