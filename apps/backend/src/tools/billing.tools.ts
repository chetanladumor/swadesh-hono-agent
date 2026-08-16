import { prisma } from "../db/prisma.js";
import { InvoiceStatus } from "@prisma/client";

export interface BillingToolResult {
  success: boolean;
  message: string;
  data?: any;
}

export const billingTools = {
  listUserInvoices: async (args: { userId: string }): Promise<BillingToolResult> => {
    const invoices = await prisma.invoice.findMany({
      where: { userId: args.userId },
      include: { order: { select: { orderNumber: true } } },
      orderBy: { issueDate: "desc" },
    });

    if (invoices.length === 0) {
      return {
        success: true,
        message: "No invoices found for your account.",
        data: [],
      };
    }

    return {
      success: true,
      message: `Found ${invoices.length} invoices on your billing record.`,
      data: invoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        amount: Number(inv.amount),
        status: inv.status,
        paymentMethod: inv.paymentMethod,
        refundStatus: inv.refundStatus,
        issueDate: inv.issueDate.toISOString(),
        linkedOrder: inv.order ? inv.order.orderNumber : null,
      })),
    };
  },

  getInvoiceDetails: async (args: { invoiceNumber: string }): Promise<BillingToolResult> => {
    const invoiceNumber = args.invoiceNumber.trim().toUpperCase();
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: {
        order: { select: { orderNumber: true, status: true } },
        user: { select: { name: true, email: true } },
      },
    });

    if (!invoice) {
      return {
        success: false,
        message: `Invoice "${invoiceNumber}" not found in billing records.`,
      };
    }

    return {
      success: true,
      message: `Invoice ${invoice.invoiceNumber} is ${invoice.status} for $${Number(invoice.amount).toFixed(2)}.`,
      data: {
        invoiceNumber: invoice.invoiceNumber,
        amount: Number(invoice.amount),
        status: invoice.status,
        paymentMethod: invoice.paymentMethod,
        refundStatus: invoice.refundStatus,
        refundAmount: invoice.refundAmount ? Number(invoice.refundAmount) : null,
        issueDate: invoice.issueDate.toISOString(),
        dueDate: invoice.dueDate.toISOString(),
        paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
        linkedOrder: invoice.order ? invoice.order.orderNumber : null,
      },
    };
  },

  checkRefundStatus: async (args: { query: string }): Promise<BillingToolResult> => {
    const term = args.query.trim().toUpperCase();

    const invoice = await prisma.invoice.findFirst({
      where: {
        OR: [
          { invoiceNumber: term },
          { order: { orderNumber: term } },
        ],
      },
      include: { order: true },
    });

    if (!invoice) {
      return {
        success: false,
        message: `No invoice or refund record found for reference "${term}".`,
      };
    }

    if (invoice.status === InvoiceStatus.REFUNDED) {
      return {
        success: true,
        message: `Refund has been completed for invoice ${invoice.invoiceNumber} (Amount: $${invoice.refundAmount || invoice.amount}). Details: ${invoice.refundStatus || "Credited to original payment method."}`,
        data: {
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          refundAmount: Number(invoice.refundAmount || invoice.amount),
          refundStatus: invoice.refundStatus,
        },
      };
    }

    if (invoice.refundStatus) {
      return {
        success: true,
        message: `Refund is in progress: ${invoice.refundStatus}`,
        data: {
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          refundStatus: invoice.refundStatus,
        },
      };
    }

    return {
      success: true,
      message: `Invoice ${invoice.invoiceNumber} (Amount: $${invoice.amount}) is marked as ${invoice.status}. No refund has been processed yet.`,
      data: {
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        amount: Number(invoice.amount),
      },
    };
  },

  requestRefund: async (args: { invoiceNumber: string; reason?: string }): Promise<BillingToolResult> => {
    const invoiceNumber = args.invoiceNumber.trim().toUpperCase();
    const invoice = await prisma.invoice.findUnique({ where: { invoiceNumber } });

    if (!invoice) {
      return {
        success: false,
        message: `Cannot process refund. Invoice "${invoiceNumber}" not found.`,
      };
    }

    if (invoice.status === InvoiceStatus.REFUNDED) {
      return {
        success: true,
        message: `Invoice ${invoiceNumber} has already been fully refunded.`,
      };
    }

    const updated = await prisma.invoice.update({
      where: { invoiceNumber },
      data: {
        status: InvoiceStatus.REFUNDED,
        refundStatus: `Refund initiated on ${new Date().toDateString()} for reason: "${args.reason || "Customer requested"}"`,
        refundAmount: invoice.amount,
      },
    });

    return {
      success: true,
      message: `A full refund of $${updated.amount} for invoice ${invoiceNumber} has been initiated back to ${invoice.paymentMethod}. Funds will appear in 3-5 business days.`,
      data: {
        invoiceNumber: updated.invoiceNumber,
        status: updated.status,
        refundAmount: Number(updated.refundAmount),
      },
    };
  },

  getSubscriptionDetails: async (args: { userId: string }): Promise<BillingToolResult> => {
    const invoices = await prisma.invoice.findMany({
      where: { userId: args.userId, orderId: null },
      orderBy: { issueDate: "desc" },
    });

    return {
      success: true,
      message: `Found ${invoices.length} recurring subscription invoices.`,
      data: invoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        amount: Number(inv.amount),
        status: inv.status,
        issueDate: inv.issueDate.toISOString(),
      })),
    };
  },
};
