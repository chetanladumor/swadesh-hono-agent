import { orderTools } from "../tools/order.tools.js";
import { billingTools } from "../tools/billing.tools.js";
import { supportTools } from "../tools/support.tools.js";
import type { AgentType, ReasoningStep, ToolCallRecord } from "@swadesh/shared";

export class LLMService {
  static getApiKey(): string | null {
    return process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || null;
  }

  static async runWithLLM(
    query: string,
    history: { role: string; content: string; agentType?: string }[],
    user: { id: string; name: string; email: string; address?: string | null },
    overrideAgent?: AgentType
  ): Promise<{ response: string; agentType: AgentType; reasoningSteps: ReasoningStep[]; toolCalls: ToolCallRecord[] } | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const startTime = Date.now();
    const now = () => new Date().toISOString();
    const reasoningSteps: ReasoningStep[] = [];
    const toolCalls: ToolCallRecord[] = [];

    let detectedAgent: AgentType = overrideAgent || "ROUTER";

    reasoningSteps.push({
      id: `llm_step_1_${Date.now()}`,
      stage: "analyzing",
      agent: "ROUTER",
      thought: `Analyzing inquiry from ${user.name}. Determining intent scope (specific order/invoice vs. account-wide overview).`,
      timestamp: now(),
    });

    // 1. Fetch live customer records
    const [ordersRes, invoicesRes, kbRes] = await Promise.all([
      orderTools.listUserOrders({ userId: user.id }),
      billingTools.listUserInvoices({ userId: user.id }),
      supportTools.queryKnowledgeBase({ query }),
    ]);

    // Record tool traces
    const orderToolRecord: ToolCallRecord = {
      id: `tool_${Date.now()}_orders`,
      name: "listUserOrders",
      args: { userId: user.id },
      result: ordersRes.data,
      timestamp: now(),
    };
    toolCalls.push(orderToolRecord);

    const invoiceToolRecord: ToolCallRecord = {
      id: `tool_${Date.now()}_invoices`,
      name: "listUserInvoices",
      args: { userId: user.id },
      result: invoicesRes.data,
      timestamp: now(),
    };
    toolCalls.push(invoiceToolRecord);

    // Sub-agent classification
    const lower = query.toLowerCase();
    if (lower.includes("policy") || lower.includes("warranty") || lower.includes("troubleshoot") || lower.includes("faq") || lower.includes("how to") || lower.includes("who am i") || lower.includes("help")) {
      detectedAgent = "SUPPORT";
    } else if (lower.includes("refund") || lower.includes("invoice") || lower.includes("bill") || lower.includes("pay") || lower.includes("subscri") || lower.includes("charge")) {
      detectedAgent = "BILLING";
    } else if (lower.includes("order") || lower.includes("ordwer") || lower.includes("track") || lower.includes("deliver") || lower.includes("ship") || lower.includes("return") || lower.includes("cancel")) {
      detectedAgent = "ORDER";
    }

    reasoningSteps.push({
      id: `step_${Date.now()}_tools`,
      stage: "tool_execution",
      agent: detectedAgent,
      thought: `Routed to ${detectedAgent} Agent with database records.`,
      timestamp: now(),
      toolCall: detectedAgent === "BILLING" ? invoiceToolRecord : orderToolRecord,
    });

    const systemPrompt = `You are Swadesh AI, an intelligent, concise, and helpful customer support specialist.

AUTHENTICATED CUSTOMER:
- Name: ${user.name}
- Email: ${user.email}
- User ID: ${user.id}
- Delivery Address: ${user.address || "452 Innovation Way, Suite 800, San Francisco, CA 94107"}

DATABASE RECORDS FOR THIS CUSTOMER:
Orders:
${JSON.stringify(ordersRes.data, null, 2)}

Invoices:
${JSON.stringify(invoicesRes.data, null, 2)}

Knowledge Base Policies:
${JSON.stringify(kbRes.data, null, 2)}

RESPONSE RULES:
1. FOCUS STRICTLY ON WHAT WAS ASKED:
   - If the user asks for a SPECIFIC order or bill (e.g. "bill of order 1002", "where is ORDER-1001?"), ONLY provide the details for that specific requested item! Do NOT list or dump other unrelated orders.
   - ONLY list all orders if the user explicitly asks for an overall summary/list (e.g. "what are all my orders?", "list my orders", "how many orders did I make?").
2. ACCURACY:
   - Always state exact Order IDs (e.g. ORDER-1002), Invoice IDs (e.g. INV-2024-002), amounts, payment methods, and tracking numbers.
3. CONCISENESS:
   - Keep your responses direct, helpful, and free of redundant clutter.`;

    const chatHistoryText = history
      .slice(-4)
      .map((m) => `${m.role === "user" ? user.name : "Swadesh AI"}: ${m.content}`)
      .join("\n");

    const prompt = `${systemPrompt}\n\nConversation History:\n${chatHistoryText}\n\nCustomer Query: ${query}\n\nSwadesh AI Response:`;

    const preferredModel = "gemini-3-flash-preview";
    let aiText = "";

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${preferredModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      const data = await response.json();
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        aiText = data.candidates[0].content.parts[0].text;
      }
    } catch (err) {
      console.error("Fast LLM call failed:", err);
    }

    if (!aiText) {
      return null;
    }

    const elapsed = Date.now() - startTime;
    reasoningSteps.push({
      id: `llm_step_gen_${Date.now()}`,
      stage: "generating",
      agent: detectedAgent,
      thought: `Generated targeted response for ${user.name} in ${elapsed}ms.`,
      timestamp: now(),
    });

    return {
      response: aiText,
      agentType: detectedAgent,
      reasoningSteps,
      toolCalls,
    };
  }
}
