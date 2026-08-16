import type { AgentType, ReasoningStep, ToolCallRecord } from "@swadesh/shared";
import { ContextManager, type CompactedContext } from "./context.manager.js";
import { SupportAgent } from "./support.agent.js";
import { OrderAgent } from "./order.agent.js";
import { BillingAgent } from "./billing.agent.js";
import { LLMService } from "./llm.service.js";

export interface DispatchResult {
  agentType: AgentType;
  response: string;
  reasoningSteps: ReasoningStep[];
  toolCalls: ToolCallRecord[];
}

export class RouterAgent {
  static classifyIntent(query: string, context: CompactedContext): { agentType: AgentType; confidence: number; rationale: string } {
    const text = query.toLowerCase();

    // 1. Support Policies & FAQs first (e.g. "return policy", "warranty", "troubleshooting")
    const isSupport = /policy|warranty|troubleshoot|how to|contact|support|hours|reset|who am i|hello|hi|faq/i.test(text);
    if (isSupport && !text.includes("invoice") && context.currentEntities.orderNumbers.length === 0) {
      return {
        agentType: "SUPPORT",
        confidence: 0.90,
        rationale: "Detected company support policy, warranty, troubleshooting, or account profile inquiry. Delegating to Support Agent.",
      };
    }

    // 2. Explicit Order signals (e.g. "track order", "ORDER-1001", "return my order")
    const isOrder = /order|ordwer|track|shipping|delivery|package|carrier|fedex|ups|shipped|arrived|purchases|cancel/i.test(text);
    const hasOrderId = context.currentEntities.orderNumbers.length > 0 || (context.historicalEntities.orderNumbers.length > 0 && !text.includes("invoice") && !text.includes("refund"));
    if (hasOrderId || isOrder) {
      return {
        agentType: "ORDER",
        confidence: 0.95,
        rationale: `Detected order-related intent with entities: [${context.currentEntities.orderNumbers.join(", ") || "Order inquiry keyword"}]. Delegating to Order Agent.`,
      };
    }

    // 3. Billing signals
    const isBilling = /invoice|refund|payment|charge|receipt|subscription|credit card|billing|billed|money back/i.test(text);
    const hasInvoiceId = context.currentEntities.invoiceNumbers.length > 0;
    if (hasInvoiceId || isBilling) {
      return {
        agentType: "BILLING",
        confidence: 0.93,
        rationale: `Detected financial/billing query with terms: [${context.currentEntities.invoiceNumbers.join(", ") || "Billing transaction keyword"}]. Delegating to Billing Agent.`,
      };
    }

    // 4. Default / Fallback
    return {
      agentType: "FALLBACK",
      confidence: 0.65,
      rationale: "Query does not strongly match specific domain. Providing general AI assistance and routing to Support agent.",
    };
  }

  static async routeAndExecute(
    query: string,
    history: { role: string; content: string; agentType?: string }[],
    user: { id: string; name: string; email: string; address?: string | null },
    overrideAgent?: AgentType
  ): Promise<DispatchResult> {
    // 1. Live LLM execution (OpenAI / Gemini)
    const llmResult = await LLMService.runWithLLM(query, history, user, overrideAgent);
    if (llmResult) {
      return llmResult;
    }

    // 2. Deterministic Fallback Engine
    const now = () => new Date().toISOString();
    const routerReasoning: ReasoningStep[] = [];

    const compactedContext = ContextManager.compact(
      query,
      history,
      `You are the central Router Agent for an enterprise customer support platform. Active customer: ${user.name} (${user.email}).`
    );

    routerReasoning.push({
      id: `router_step_1_${Date.now()}`,
      stage: "analyzing",
      agent: "ROUTER",
      thought: `Analyzing query: "${query}" from customer ${user.name}. Current Entities -> Orders: [${compactedContext.currentEntities.orderNumbers.join(", ") || "None"}], Invoices: [${compactedContext.currentEntities.invoiceNumbers.join(", ") || "None"}]. Account-level query: ${compactedContext.isAccountLevelQuery}.`,
      timestamp: now(),
    });

    const classification = overrideAgent
      ? { agentType: overrideAgent, confidence: 1.0, rationale: `User explicitly selected agent: ${overrideAgent}` }
      : this.classifyIntent(query, compactedContext);

    routerReasoning.push({
      id: `router_step_2_${Date.now()}`,
      stage: "routing",
      agent: "ROUTER",
      thought: `Classification outcome: ${classification.agentType} (Confidence: ${(classification.confidence * 100).toFixed(0)}%). ${classification.rationale}`,
      timestamp: now(),
    });

    let subAgentResult: { response: string; reasoningSteps: ReasoningStep[]; toolCalls: ToolCallRecord[] };

    if (classification.agentType === "ORDER") {
      subAgentResult = await OrderAgent.execute(query, compactedContext, user);
    } else if (classification.agentType === "BILLING") {
      subAgentResult = await BillingAgent.execute(query, compactedContext, user);
    } else {
      subAgentResult = await SupportAgent.execute(query, compactedContext, user);
    }

    return {
      agentType: classification.agentType === "FALLBACK" ? "SUPPORT" : classification.agentType,
      response: subAgentResult.response,
      reasoningSteps: [...routerReasoning, ...subAgentResult.reasoningSteps],
      toolCalls: subAgentResult.toolCalls,
    };
  }
}
