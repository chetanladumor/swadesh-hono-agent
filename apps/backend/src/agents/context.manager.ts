import type { ChatMessage } from "@swadesh/shared";

export interface CompactedContext {
  systemInstructions: string;
  recentMessages: { role: string; content: string }[];
  summary?: string;
  currentEntities: {
    orderNumbers: string[];
    invoiceNumbers: string[];
    topics: string[];
  };
  historicalEntities: {
    orderNumbers: string[];
    invoiceNumbers: string[];
    topics: string[];
  };
  isAccountLevelQuery: boolean;
}

export class ContextManager {
  private static MAX_CONTEXT_MESSAGES = 10;

  static extractEntities(text: string): { orderNumbers: string[]; invoiceNumbers: string[]; topics: string[] } {
    const orderMatches = text.match(/ORDER-\d{3,5}/gi) || [];
    const invoiceMatches = text.match(/INV-\d{4}-\d{3,5}/gi) || [];

    const topics: string[] = [];
    const lower = text.toLowerCase();
    if (lower.includes("refund") || lower.includes("charge") || lower.includes("pay")) topics.push("billing");
    if (lower.includes("delivery") || lower.includes("track") || lower.includes("ship") || lower.includes("package")) topics.push("shipping");
    if (lower.includes("return") || lower.includes("warranty") || lower.includes("policy")) topics.push("policy");

    return {
      orderNumbers: Array.from(new Set(orderMatches.map((s) => s.toUpperCase()))),
      invoiceNumbers: Array.from(new Set(invoiceMatches.map((s) => s.toUpperCase()))),
      topics,
    };
  }

  static isAccountLevel(query: string): boolean {
    const lower = query.toLowerCase();
    return (
      lower.includes("just one") ||
      lower.includes("only one") ||
      lower.includes("single order") ||
      lower.includes("how many") ||
      lower.includes("my orders") ||
      lower.includes("all orders") ||
      lower.includes("list orders") ||
      lower.includes("my purchases") ||
      lower.includes("my invoices") ||
      lower.includes("all invoices") ||
      lower.includes("who am i") ||
      lower.includes("my profile")
    );
  }

  static compact(
    currentQuery: string,
    history: { role: string; content: string; agentType?: string }[],
    systemPrompt: string
  ): CompactedContext {
    const currentEntities = this.extractEntities(currentQuery);
    const historicalEntities = {
      orderNumbers: [] as string[],
      invoiceNumbers: [] as string[],
      topics: [] as string[],
    };

    for (const msg of history) {
      const e = this.extractEntities(msg.content);
      historicalEntities.orderNumbers.push(...e.orderNumbers);
      historicalEntities.invoiceNumbers.push(...e.invoiceNumbers);
      historicalEntities.topics.push(...e.topics);
    }

    historicalEntities.orderNumbers = Array.from(new Set(historicalEntities.orderNumbers));
    historicalEntities.invoiceNumbers = Array.from(new Set(historicalEntities.invoiceNumbers));
    historicalEntities.topics = Array.from(new Set(historicalEntities.topics));

    let recent = history;
    let summary: string | undefined;

    if (history.length > this.MAX_CONTEXT_MESSAGES) {
      const older = history.slice(0, history.length - this.MAX_CONTEXT_MESSAGES);
      recent = history.slice(history.length - this.MAX_CONTEXT_MESSAGES);

      summary = `Conversation History Summary: Customer previously discussed ${
        historicalEntities.orderNumbers.length ? "orders [" + historicalEntities.orderNumbers.join(", ") + "]" : "support inquiries"
      } over ${older.length} messages.`;
    }

    return {
      systemInstructions: systemPrompt,
      recentMessages: recent.map((m) => ({ role: m.role, content: m.content })),
      summary,
      currentEntities,
      historicalEntities,
      isAccountLevelQuery: this.isAccountLevel(currentQuery),
    };
  }
}
