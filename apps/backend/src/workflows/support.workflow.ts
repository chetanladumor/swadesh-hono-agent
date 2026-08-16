import type { AgentType, ReasoningStep, ToolCallRecord } from "@swadesh/shared";
import { RouterAgent } from "../agents/router.agent.js";

export interface SupportWorkflowState {
  conversationId?: string;
  userId: string;
  query: string;
  stage: "INITIATED" | "ROUTING" | "TOOL_EXECUTION" | "RESPONSE_SYNTHESIS" | "COMPLETED" | "FAILED";
  assignedAgent?: AgentType;
  reasoningSteps: ReasoningStep[];
  toolCalls: ToolCallRecord[];
  finalResponse?: string;
}

/**
 * Durable Workflow Engine (implementing the useworkflow.dev pattern)
 * Orchestrates step-by-step stateful execution of the Multi-Agent lifecycle:
 * Step 1: Input Validation & Context Extraction
 * Step 2: Intent Classification & Agent Delegation
 * Step 3: Tool Invocation & Database Query
 * Step 4: LLM Synthesis & Policy Verification
 * Step 5: Audit Log & State Persistence
 */
export class CustomerSupportWorkflow {
  static async execute(params: {
    query: string;
    userId: string;
    conversationId?: string;
    history: { role: string; content: string; agentType?: string }[];
    user: { id: string; name: string; email: string; address?: string | null };
    preferredAgent?: AgentType;
  }): Promise<SupportWorkflowState> {
    const state: SupportWorkflowState = {
      conversationId: params.conversationId,
      userId: params.userId,
      query: params.query,
      stage: "INITIATED",
      reasoningSteps: [],
      toolCalls: [],
    };

    try {
      state.stage = "ROUTING";
      const result = await RouterAgent.routeAndExecute(
        params.query,
        params.history,
        params.user,
        params.preferredAgent
      );

      state.stage = "TOOL_EXECUTION";
      state.assignedAgent = result.agentType;
      state.reasoningSteps = result.reasoningSteps;
      state.toolCalls = result.toolCalls;

      state.stage = "COMPLETED";
      state.finalResponse = result.response;

      return state;
    } catch (err: any) {
      state.stage = "FAILED";
      throw err;
    }
  }
}
