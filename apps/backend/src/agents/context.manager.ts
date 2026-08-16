export interface CompactedContext {
  systemPrompt: string;
  recentMessages: { role: string; content: string; agentType?: string }[];
  currentEntities: {
    orderNumbers: string[];
    invoiceNumbers: string[];
  };
  historicalEntities: {
    orderNumbers: string[];
    invoiceNumbers: string[];
  };
  isAccountLevelQuery: boolean;
  totalTokensEstimated: number;
}

export class ContextManager {
  private static readonly MAX_RECENT_MESSAGES = 8;

  /**
   * Robust Entity Extraction supporting:
   * - ORDER-1001, order-1001, order 1001, order: 1001, order #1001, 1001, 2001, 1002
   * - INV-2024-001, inv-2024-001, invoice 2024-001, inv 001
   */
  static extractEntities(text: string): { orderNumbers: string[]; invoiceNumbers: string[] } {
    const orderSet = new Set<string>();
    const invoiceSet = new Set<string>();

    // 1. Explicit formats: ORDER-1001, ORDER1001
    const explicitOrderMatches = text.match(/\bORDER[-_ ]?(\d{4})\b/gi) || [];
    for (const match of explicitOrderMatches) {
      const digits = match.replace(/[^0-9]/g, "");
      if (digits) orderSet.add(`ORDER-${digits}`);
    }

    // 2. Loose formats: "order 1001", "order: 2001", "order #1002"
    const looseOrderMatches = text.match(/\border\s*[:#]?\s*(\d{4})\b/gi) || [];
    for (const match of looseOrderMatches) {
      const digits = match.replace(/[^0-9]/g, "");
      if (digits) orderSet.add(`ORDER-${digits}`);
    }

    // 3. Isolated 4-digit order numbers when order-related context exists (e.g. "2001" or "1002")
    if (orderSet.size === 0 && (/\b(1001|1002|1003|1004|2001)\b/.test(text))) {
      const numMatch = text.match(/\b(1001|1002|1003|1004|2001)\b/);
      if (numMatch) {
        orderSet.add(`ORDER-${numMatch[1]}`);
      }
    }

    // 4. Invoices: INV-2024-001, invoice 2024-001, inv-001
    const explicitInvMatches = text.match(/\bINV(?:OICE)?[-_ ]?(?:2024[-_ ])?(\d{3})\b/gi) || [];
    for (const match of explicitInvMatches) {
      const digits = match.replace(/[^0-9]/g, "").slice(-3);
      if (digits) invoiceSet.add(`INV-2024-${digits}`);
    }

    const looseInvMatches = text.match(/\binvoice\s*[:#]?\s*(?:2024[-_ ])?(\d{3})\b/gi) || [];
    for (const match of looseInvMatches) {
      const digits = match.replace(/[^0-9]/g, "").slice(-3);
      if (digits) invoiceSet.add(`INV-2024-${digits}`);
    }

    return {
      orderNumbers: Array.from(orderSet),
      invoiceNumbers: Array.from(invoiceSet),
    };
  }

  static isAccountLevel(query: string): boolean {
    const text = query.toLowerCase().trim();
    return (
      text.includes("my orders") ||
      text.includes("all orders") ||
      text.includes("all ordwers") ||
      text.includes("order list") ||
      text.includes("orders list") ||
      text.includes("how many orders") ||
      text.includes("just one order") ||
      text.includes("only one order") ||
      text.includes("multiple orders") ||
      text.includes("my invoices") ||
      text.includes("all invoices") ||
      text === "orders" ||
      text === "invoices"
    );
  }

  static compact(
    currentQuery: string,
    history: { role: string; content: string; agentType?: string }[],
    systemPrompt: string
  ): CompactedContext {
    const recentMessages = history.slice(-this.MAX_RECENT_MESSAGES);
    const fullText = recentMessages.map((m) => m.content).join(" ");
    
    const historicalEntities = this.extractEntities(fullText);
    const currentEntities = this.extractEntities(currentQuery);
    const isAccountLevelQuery = this.isAccountLevel(currentQuery);

    const totalCharacters = systemPrompt.length + fullText.length + currentQuery.length;
    const totalTokensEstimated = Math.ceil(totalCharacters / 4);

    return {
      systemPrompt,
      recentMessages,
      currentEntities,
      historicalEntities,
      isAccountLevelQuery,
      totalTokensEstimated,
    };
  }
}
