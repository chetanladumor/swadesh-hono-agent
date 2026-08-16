import type { AgentInfo, AgentType } from "@swadesh/shared";

export const AGENT_REGISTRY: Record<AgentType, AgentInfo> = {
  ROUTER: {
    type: "ROUTER",
    name: "Master Router Agent",
    description: "Central intent classification and multi-agent dispatch coordinator.",
    capabilities: [
      "Real-time intent classification with confidence scores",
      "Entity extraction for Order IDs (ORDER-XXXX) and Invoice IDs (INV-XXXX)",
      "Context compaction and conversation summarization",
      "Graceful fallback handling for ambiguous or broad inquiries",
    ],
    tools: ["classifyIntent", "compactContext", "extractEntities"],
    systemPrompt: "You are the central router agent for the enterprise support system. Analyze queries and delegate to specialized sub-agents.",
  },
  SUPPORT: {
    type: "SUPPORT",
    name: "Customer Support Agent",
    description: "Specialized in company policies, FAQs, warranty, and technical troubleshooting.",
    capabilities: [
      "Query knowledge base for returns, shipping, warranty, and cancellations",
      "Search historical conversations for customer context",
      "Provide step-by-step hardware and software troubleshooting steps",
    ],
    tools: ["queryKnowledgeBase", "queryConversationHistory"],
    systemPrompt: "You are a friendly, knowledgeable Customer Support Agent. Provide clear policy explanations and troubleshooting assistance.",
  },
  ORDER: {
    type: "ORDER",
    name: "Order & Logistics Agent",
    description: "Specialized in tracking deliveries, item manifests, cancellations, and address updates.",
    capabilities: [
      "Fetch real-time order breakdown and itemized receipts",
      "Check live courier tracking status (FedEx / UPS / DHL)",
      "Cancel pending or processing orders",
      "Update delivery destination addresses before dispatch",
    ],
    tools: ["fetchOrderDetails", "checkDeliveryStatus", "cancelOrder", "modifyShippingAddress"],
    systemPrompt: "You are a Logistics and Fulfillment specialist. Query live database order records and assist customers with order status and management.",
  },
  BILLING: {
    type: "BILLING",
    name: "Billing & Finance Agent",
    description: "Specialized in payment transactions, refunds, invoices, and subscription plans.",
    capabilities: [
      "Retrieve itemized invoice details and payment confirmations",
      "Check refund processing status and credit timelines",
      "Initiate automated refund workflows",
      "Inspect recurring subscriptions and billing cycles",
    ],
    tools: ["getInvoiceDetails", "checkRefundStatus", "requestRefund", "getSubscriptionDetails"],
    systemPrompt: "You are a Billing and Financial specialist. Provide accurate financial summaries and process authorized refund requests safely.",
  },
  FALLBACK: {
    type: "FALLBACK",
    name: "General Assistance Agent",
    description: "Handles greetings, ambiguous queries, and general inquiries.",
    capabilities: [
      "Conversational greeting and guidance",
      "Clarification prompts for missing order or invoice IDs",
    ],
    tools: ["queryKnowledgeBase"],
    systemPrompt: "You are a helpful general assistant. Guide the user to provide their order or invoice details.",
  },
};

export class AgentService {
  static getAvailableAgents(): AgentInfo[] {
    return Object.values(AGENT_REGISTRY);
  }

  static getAgentCapabilities(type: string): AgentInfo | null {
    const key = type.toUpperCase() as AgentType;
    return AGENT_REGISTRY[key] || null;
  }
}
