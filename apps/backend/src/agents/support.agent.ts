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
    const lower = query.toLowerCase().trim();

    reasoningSteps.push({
      id: `step_${Date.now()}_1`,
      stage: "analyzing",
      agent: "SUPPORT",
      thought: `Analyzing general support inquiry from customer ${user.name}: "${query}".`,
      timestamp: now(),
    });

    // 1. Natural Greeting Handling
    const isGreeting = /^(hi|hello|hey|greetings|good morning|good afternoon|good evening|howdy|sup|yo)[!., ]*$/i.test(lower);
    if (isGreeting) {
      reasoningSteps.push({
        id: `step_${Date.now()}_2`,
        stage: "generating",
        agent: "SUPPORT",
        thought: "Customer sent greeting. Generating friendly welcome message.",
        timestamp: now(),
      });

      const response = `Hello **${user.name}**! 👋 Welcome to Swadesh Support.\n\nHow can I help you today? Here are a few things I can assist with:\n- 📦 **Order Tracking & Updates** (e.g. *"Where is my order?"* or *"ORDER-1001"*)\n- 🔄 **Returns & RMA Authorization** (e.g. *"I want to return an item"*)\n- 💳 **Billing & Invoices** (e.g. *"Check invoice refund status"*)\n- 🔧 **Policies & Technical Troubleshooting** (e.g. *"What is the return window?"*)\n\nFeel free to ask any question or mention an Order / Invoice ID!`;
      return { response, reasoningSteps, toolCalls };
    }

    // 2. Profile Inquiry
    if (lower.includes("who am i") || lower.includes("my profile") || lower.includes("my address")) {
      const profile = await supportTools.getUserProfile({ userId: user.id });
      const toolCallRecord: ToolCallRecord = {
        id: `tool_${Date.now()}_profile`,
        name: "getUserProfile",
        args: { userId: user.id },
        result: profile.data,
        timestamp: now(),
      };
      toolCalls.push(toolCallRecord);

      reasoningSteps.push({
        id: `step_${Date.now()}_2`,
        stage: "tool_execution",
        agent: "SUPPORT",
        thought: `Retrieved customer profile for ${user.name}.`,
        timestamp: now(),
        toolCall: toolCallRecord,
      });

      const d = profile.data;
      const response = `### Customer Profile\n\n- **Name**: ${d.name}\n- **Email**: ${d.email}\n- **Phone**: ${d.phone || "Not on file"}\n- **Default Shipping Address**: ${d.address || "Not provided"}`;
      return { response, reasoningSteps, toolCalls };
    }

    // 3. Knowledge Base Query for Policies & FAQs
    const toolName = "queryKnowledgeBase";
    const toolResult = await supportTools.queryKnowledgeBase({ query });

    const toolCallRecord: ToolCallRecord = {
      id: `tool_${Date.now()}_${toolName}`,
      name: toolName,
      args: { query },
      result: toolResult.data,
      timestamp: now(),
    };
    toolCalls.push(toolCallRecord);

    reasoningSteps.push({
      id: `step_${Date.now()}_2`,
      stage: "tool_execution",
      agent: "SUPPORT",
      thought: `Queried Knowledge Base for policy articles matching query.`,
      timestamp: now(),
      toolCall: toolCallRecord,
    });

    const articles = toolResult.data || [];
    let response = "";

    if (articles.length > 0) {
      response = articles
        .map((a: any) => `**${a.title}** (${a.category})\n\n${a.content}`)
        .join("\n\n---\n\n");
      response += `\n\n*Hello ${user.name}, if you need help with a specific order or invoice, simply share your Order ID (e.g. ORDER-1001) or Invoice ID (e.g. INV-2024-001).*`;
    } else {
      response = `Hello **${user.name}**, I searched our support documentation for *"${query}"* but could not find an exact policy match.\n\nYou can ask me about:\n- **30-day return window & procedures**\n- **Delivery timelines & carrier tracking**\n- **Warranty coverage & troubleshooting steps**\n- **Invoice and subscription details**`;
    }

    reasoningSteps.push({
      id: `step_${Date.now()}_3`,
      stage: "generating",
      agent: "SUPPORT",
      thought: "Synthesized policy details into user-friendly response.",
      timestamp: now(),
    });

    return { response, reasoningSteps, toolCalls };
  }
}
