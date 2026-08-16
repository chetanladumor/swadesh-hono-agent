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
      include: { order: true },
      orderBy: { issueDate: "desc" },
    });

    if (invoices.length === 0) {
      return { success: true, message: "No invoices found for your account.", data: [] };
    }

    return {
      success: true,
      message: `Found ${invoices.length} invoices on file.`,
      data: invoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        amount: Number(inv.amount),
        status: inv.status,
        paymentMethod: inv.paymentMethod,
        refundStatus: inv.refundStatus,
        refundAmount: inv.refundAmount ? Number(inv.refundAmount) : null,
        linkedOrder: inv.order?.orderNumber || null,
        issueDate: inv.issueDate.toISOString(),
      })),
    };
  },

  getInvoiceDetails: async (args: { invoiceNumber: string }): Promise<BillingToolResult> => {
    const invoiceNumber = args.invoiceNumber.trim().toUpperCase();
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: {
        order: {
          include: { items: true },
        },
        user: {
          select: { name: true, email: true },
        },
      },
    });

    if (!invoice) {
      return {
        success: false,
        message: `Invoice "${invoiceNumber}" was not found in our billing records.`,
      };
    }

    return {
      success: true,
      message: `Invoice ${invoice.invoiceNumber} is marked as ${invoice.status}.`,
      data: {
        invoiceNumber: invoice.invoiceNumber,
        amount: Number(invoice.amount),
        status: invoice.status,
        paymentMethod: invoice.paymentMethod,
        dueDate: invoice.dueDate.toISOString(),
        paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
        refundStatus: invoice.refundStatus,
        refundAmount: invoice.refundAmount ? Number(invoice.refundAmount) : null,
        linkedOrder: invoice.order?.orderNumber || null,
        orderItems: invoice.order?.items.map((i) => `${i.quantity}x ${i.productName}`) || [],
        issueDate: invoice.issueDate.toISOString(),
      },
    };
  },

  checkRefundStatus: async (args: { query: string }): Promise<BillingToolResult> => {
    const q = args.query.trim().toUpperCase();

    // Look for invoice matching invoiceNumber or linked orderNumber
    const invoice = await prisma.invoice.findFirst({
      where: {
        OR: [
          { invoiceNumber: q },
          { order: { orderNumber: q } },
        ],
      },
      include: { order: true },
    });

    if (!invoice) {
      return {
        success: false,
        message: `No payment or refund records found matching "${q}".`,
      };
    }

    if (invoice.status === InvoiceStatus.REFUNDED) {
      return {
        success: true,
        message: `Refund of $${Number(invoice.refundAmount || invoice.amount).toFixed(2)} was successfully completed for ${invoice.invoiceNumber}` + (invoice.order ? ` (Order: ${invoice.order.orderNumber})` : "") + `. Details: ${invoice.refundStatus || "Credited back to original payment method."}`,
        data: {
          invoiceNumber: invoice.invoiceNumber,
          linkedOrder: invoice.order?.orderNumber || null,
          status: invoice.status,
          refundAmount: Number(invoice.refundAmount || invoice.amount),
          refundStatus: invoice.refundStatus || "Refund Completed",
        },
      };
    }

    return {
      success: true,
      message: `Invoice ${invoice.invoiceNumber}` + (invoice.order ? ` for order ${invoice.order.orderNumber}` : "") + ` is currently "${invoice.status}". No refund has been processed for this payment.`,
      data: {
        invoiceNumber: invoice.invoiceNumber,
        linkedOrder: invoice.order?.orderNumber || null,
        status: invoice.status,
        refundAmount: 0,
        refundStatus: "No Refund Processed (Status: " + invoice.status + ")",
      },
    };
  },

  requestRefund: async (args: { invoiceNumber: string; reason?: string }): Promise<BillingToolResult> => {
    const invoiceNumber = args.invoiceNumber.trim().toUpperCase();
    const invoice = await prisma.invoice.findUnique({ where: { invoiceNumber } });

    if (!invoice) {
      return {
        success: false,
        message: `Cannot request refund. Invoice "${invoiceNumber}" not found.`,
      };
    }

    if (invoice.status === InvoiceStatus.REFUNDED) {
      return {
        success: true,
        message: `Invoice ${invoiceNumber} was already refunded.`,
      };
    }

    const updated = await prisma.invoice.update({
      where: { invoiceNumber },
      data: {
        status: InvoiceStatus.REFUNDED,
        refundAmount: invoice.amount,
        refundStatus: `Refund of $${Number(invoice.amount).toFixed(2)} initiated for invoice ${invoiceNumber}.`,
      },
    });

    return {
      success: true,
      message: `A refund of $${Number(updated.amount).toFixed(2)} for invoice ${invoiceNumber} has been initiated to your original payment method.`,
      data: {
        invoiceNumber: updated.invoiceNumber,
        refundAmount: Number(updated.amount),
        status: updated.status,
      },
    };
  },

  getSubscriptionDetails: async (args: { userId: string }): Promise<BillingToolResult> => {
    return {
      success: true,
      message: "Active subscription plan: Swadesh Pro Support. Monthly billing cycle renews on the 1st of each month.",
      data: {
        plan: "Swadesh Pro Support",
        billingCycle: "Monthly",
        nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        monthlyPrice: 49.00,
      },
    };
  },
};
