import { billingTools } from "../tools/billing.tools.js";
import type { ReasoningStep, ToolCallRecord } from "@swadesh/shared";
import type { CompactedContext } from "./context.manager.js";

export class BillingAgent {
  static async execute(
    query: string,
    context: CompactedContext,
    user: { id: string; name: string; email: string; address?: string | null }
  ): Promise<{ response: string; reasoningSteps: ReasoningStep[]; toolCalls: ToolCallRecord[] }> {
    const reasoningSteps: ReasoningStep[] = [];
    const toolCalls: ToolCallRecord[] = [];
    const now = () => new Date().toISOString();

    const specificInvoiceId = context.currentEntities.invoiceNumbers[0] || (!context.isAccountLevelQuery ? context.historicalEntities.invoiceNumbers[0] : undefined);
    const specificOrderId = context.currentEntities.orderNumbers[0] || (!context.isAccountLevelQuery ? context.historicalEntities.orderNumbers[0] : undefined);
    const lower = query.toLowerCase();

    reasoningSteps.push({
      id: `step_${Date.now()}_1`,
      stage: "analyzing",
      agent: "BILLING",
      thought: `Analyzing billing request for customer ${user.name}. Target Invoice: ${specificInvoiceId || "None"}, Target Order: ${specificOrderId || "None"}.`,
      timestamp: now(),
    });

    // If no specific invoice or refund target is given and user asks for invoices
    if (!specificInvoiceId && !specificOrderId && (lower.includes("invoices") || lower.includes("bills") || lower.includes("payments") || lower.includes("charges") || context.isAccountLevelQuery)) {
      const toolName = "listUserInvoices";
      const toolResult = await billingTools.listUserInvoices({ userId: user.id });

      const toolCallRecord: ToolCallRecord = {
        id: `tool_${Date.now()}_${toolName}`,
        name: toolName,
        args: { userId: user.id },
        result: toolResult.data,
        timestamp: now(),
      };
      toolCalls.push(toolCallRecord);

      reasoningSteps.push({
        id: `step_${Date.now()}_2`,
        stage: "tool_execution",
        agent: "BILLING",
        thought: `Retrieved ${toolResult.data?.length || 0} invoices for ${user.name}.`,
        timestamp: now(),
        toolCall: toolCallRecord,
      });

      const invoices = toolResult.data || [];
      const invoiceList = invoices
        .map(
          (inv: any) =>
            `- **${inv.invoiceNumber}** — \`${inv.status}\` | Amount: $${inv.amount.toFixed(2)} | Method: ${inv.paymentMethod}` +
            (inv.linkedOrder ? ` (Order: \`${inv.linkedOrder}\`)` : "")
        )
        .join("\n");

      const response = `Hello **${user.name}**, here are the invoices recorded for your account (*${user.email}*):\n\n${invoiceList || "No invoices found on file."}\n\n*You can ask me to inspect an invoice or check refund status by mentioning the Invoice ID (e.g. INV-2024-001) or Order ID.*`;

      reasoningSteps.push({
        id: `step_${Date.now()}_3`,
        stage: "generating",
        agent: "BILLING",
        thought: "Assembled billing list response.",
        timestamp: now(),
      });

      return { response, reasoningSteps, toolCalls };
    }

    let toolName = "getInvoiceDetails";
    let toolResult: any;

    if (lower.includes("refund") && (lower.includes("request") || lower.includes("want") || lower.includes("process"))) {
      toolName = "requestRefund";
      toolResult = await billingTools.requestRefund({
        invoiceNumber: specificInvoiceId || "INV-2024-001",
        reason: "Customer requested refund through AI support assistant",
      });
    } else if (lower.includes("refund") || lower.includes("money back")) {
      toolName = "checkRefundStatus";
      const targetQuery = specificOrderId || specificInvoiceId || "INV-2024-002";
      toolResult = await billingTools.checkRefundStatus({ query: targetQuery });
    } else if (lower.includes("subscription")) {
      toolName = "getSubscriptionDetails";
      toolResult = await billingTools.getSubscriptionDetails({ userId: user.id });
    } else {
      toolName = "getInvoiceDetails";
      toolResult = await billingTools.getInvoiceDetails({ invoiceNumber: specificInvoiceId || "INV-2024-001" });
    }

    const toolCallRecord: ToolCallRecord = {
      id: `tool_${Date.now()}_${toolName}`,
      name: toolName,
      args: { invoiceNumber: specificInvoiceId, orderNumber: specificOrderId, query },
      result: toolResult.data,
      timestamp: now(),
    };
    toolCalls.push(toolCallRecord);

    reasoningSteps.push({
      id: `step_${Date.now()}_2`,
      stage: "tool_execution",
      agent: "BILLING",
      thought: `Queried billing ledger using ${toolName}. Result: ${toolResult.success ? "Success" : "Notice"}.`,
      timestamp: now(),
      toolCall: toolCallRecord,
    });

    let response = "";
    if (toolResult.success) {
      if (toolName === "checkRefundStatus") {
        const d = toolResult.data;
        response = `### Refund Status Summary (Customer: **${user.name}**)\n\n- **Invoice**: \`${d.invoiceNumber}\`\n- **Status**: \`${d.status}\`\n\n${toolResult.message}`;
      } else if (toolName === "requestRefund") {
        response = `### Refund Request Confirmation\n\nHello **${user.name}**, ${toolResult.message}\n\nAn official email receipt has been dispatched to *${user.email}*.`;
      } else if (toolName === "getSubscriptionDetails") {
        response = `### Active Subscriptions & Invoicing\n\nHello **${user.name}**, ${toolResult.message}`;
      } else {
        const d = toolResult.data;
        response = `### Invoice Breakdown: ${d.invoiceNumber}\n**Customer**: ${user.name} (${user.email})\n\n- **Amount**: $${Number(d.amount).toFixed(2)}\n- **Payment Status**: \`${d.status}\`\n- **Payment Method**: ${d.paymentMethod}\n- **Issued On**: ${new Date(d.issueDate).toDateString()}` + (d.linkedOrder ? `\n- **Linked Order**: \`${d.linkedOrder}\`` : "");
      }
    } else {
      response = `### Billing Ledger Notification\n\nHello **${user.name}**, ${toolResult.message}`;
    }

    reasoningSteps.push({
      id: `step_${Date.now()}_3`,
      stage: "generating",
      agent: "BILLING",
      thought: "Assembled billing breakdown and payment records for customer view.",
      timestamp: now(),
    });

    return { response, reasoningSteps, toolCalls };
  }
}
