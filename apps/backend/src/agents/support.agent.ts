import { supportTools } from "../tools/support.tools.js";
import type { ReasoningStep, ToolCallRecord } from "@swadesh/shared";
import type { CompactedContext } from "./context.manager.js";

export class SupportAgent {
  static async execute(
    query: string,
    context: CompactedContext,
    user: { id: string; name: string; email: string; address?: string | null }
  ): Promise<{ response: string; reasoningSteps: ReasoningStep[]; toolCalls: ToolCallRecord[] }> {
    const reasoningSteps: ReasoningStep[] = [];
    const toolCalls: ToolCallRecord[] = [];
    const now = () => new Date().toISOString();
    const lower = query.toLowerCase();

    reasoningSteps.push({
      id: `step_${Date.now()}_1`,
      stage: "analyzing",
      agent: "SUPPORT",
      thought: `Processing customer support query for ${user.name}. Determining whether to query knowledge base, user profile, or past tickets.`,
      timestamp: now(),
    });

    // Check if greeting or identity query
    if (lower.includes("who am i") || lower.includes("my name") || lower.includes("my profile") || lower.includes("my address")) {
      const response = `Hello **${user.name}**! Here is your registered profile on Swadesh AI:\n\n- **Name**: ${user.name}\n- **Email**: ${user.email}\n- **Registered Address**: ${user.address || "Not set"}\n\nHow can I help you today with your orders, invoices, or support policies?`;
      reasoningSteps.push({
        id: `step_${Date.now()}_2`,
        stage: "generating",
        agent: "SUPPORT",
        thought: `Provided account profile overview for ${user.name}.`,
        timestamp: now(),
      });
      return { response, reasoningSteps, toolCalls };
    }

    let kbResult = await supportTools.queryKnowledgeBase({ query });

    const toolCallRecord: ToolCallRecord = {
      id: `tool_${Date.now()}_kb`,
      name: "queryKnowledgeBase",
      args: { query },
      result: kbResult.data,
      timestamp: now(),
    };
    toolCalls.push(toolCallRecord);

    reasoningSteps.push({
      id: `step_${Date.now()}_2`,
      stage: "tool_execution",
      agent: "SUPPORT",
      thought: `Consulted Knowledge Base for ${user.name}. ${kbResult.message}`,
      timestamp: now(),
      toolCall: toolCallRecord,
    });

    let answer = "";
    if (kbResult.success && kbResult.data && kbResult.data.length > 0) {
      const top = kbResult.data[0];
      answer = `**${top.title}** (${top.category})\n\n${top.content}\n\n*Hello ${user.name}, if you need help with a specific order or invoice, simply share your Order ID (e.g. ORDER-1001) or Invoice ID (e.g. INV-2024-001).*`;
    } else {
      answer = `Hello **${user.name}**! Thank you for reaching out to customer support. Our team is here to assist you with policies, order tracking, and billing. You can ask me questions like:\n\n- *"Where is my order ORDER-1001?"*\n- *"What are my active orders?"*\n- *"Can you check refund status for invoice INV-2024-002?"*\n- *"What is the return window policy?"*`;
    }

    reasoningSteps.push({
      id: `step_${Date.now()}_3`,
      stage: "generating",
      agent: "SUPPORT",
      thought: "Synthesized policy details into user-friendly response.",
      timestamp: now(),
    });

    return { response: answer, reasoningSteps, toolCalls };
  }
}
