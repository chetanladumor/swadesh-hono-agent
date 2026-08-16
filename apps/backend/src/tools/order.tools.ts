import { prisma } from "../db/prisma.js";
import { OrderStatus } from "@prisma/client";

export interface OrderToolResult {
  success: boolean;
  message: string;
  data?: any;
}

export const orderTools = {
  listUserOrders: async (args: { userId: string }): Promise<OrderToolResult> => {
    const orders = await prisma.order.findMany({
      where: { userId: args.userId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    if (orders.length === 0) {
      return { success: true, message: "No orders found for this account.", data: [] };
    }

    return {
      success: true,
      message: `Found ${orders.length} orders on file.`,
      data: orders.map((o) => ({
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        itemsSummary: o.items.map((i) => `${i.quantity}x ${i.productName}`).join(", "),
        carrier: o.carrier,
        trackingNumber: o.trackingNumber,
        estimatedDelivery: o.estimatedDelivery ? o.estimatedDelivery.toISOString() : null,
      })),
    };
  },

  fetchOrderDetails: async (args: { orderNumber: string }): Promise<OrderToolResult> => {
    const orderNumber = args.orderNumber.trim().toUpperCase();
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true, user: { select: { name: true, email: true } } },
    });

    if (!order) {
      return { success: false, message: `Order "${orderNumber}" was not found in our records.` };
    }

    return {
      success: true,
      message: `Order ${order.orderNumber} details retrieved. Status: ${order.status}`,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        shippingAddress: order.shippingAddress,
        carrier: order.carrier,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery ? order.estimatedDelivery.toISOString() : null,
        items: order.items.map((i) => ({
          product: i.productName,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
        })),
      },
    };
  },

  checkDeliveryStatus: async (args: { orderNumber: string }): Promise<OrderToolResult> => {
    const orderNumber = args.orderNumber.trim().toUpperCase();
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });

    if (!order) {
      return { success: false, message: `Order "${orderNumber}" not found.` };
    }

    let statusDescription = "";
    if (order.status === OrderStatus.DELIVERED) {
      statusDescription = `Package was successfully delivered via ${order.carrier || "carrier"} on ${order.estimatedDelivery ? new Date(order.estimatedDelivery).toDateString() : "recent delivery"}. Tracking: ${order.trackingNumber || "N/A"}.`;
    } else if (order.status === OrderStatus.SHIPPED) {
      statusDescription = `Shipped with ${order.carrier || "standard carrier"} (Tracking: ${order.trackingNumber || "N/A"}). Estimated arrival: ${order.estimatedDelivery ? new Date(order.estimatedDelivery).toDateString() : "in 2 business days"}.`;
    } else if (order.status === OrderStatus.PROCESSING) {
      statusDescription = `Order is currently being packed in our fulfillment center. Carrier tracking will be assigned shortly.`;
    } else if (order.status === OrderStatus.CANCELLED) {
      statusDescription = `Order was cancelled. No active shipment in transit.`;
    }

    return {
      success: true,
      message: statusDescription,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        carrier: order.carrier,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery ? order.estimatedDelivery.toISOString() : null,
        shippingAddress: order.shippingAddress,
      },
    };
  },

  initiateReturn: async (args: { orderNumber: string; reason?: string }): Promise<OrderToolResult> => {
    const orderNumber = args.orderNumber.trim().toUpperCase();
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true, invoices: true },
    });

    if (!order) {
      return { success: false, message: `Order "${orderNumber}" not found.` };
    }

    if (order.status !== OrderStatus.DELIVERED) {
      return {
        success: false,
        message: `Order ${orderNumber} is currently "${order.status}". Returns can only be initiated after the package is DELIVERED. If you wish to stop the shipment, you may request an address change or order cancellation before dispatch.`,
      };
    }

    const rmaCode = `RMA-${Math.floor(100000 + Math.random() * 900000)}`;

    // Update linked invoice refundStatus to pending return receipt
    if (order.invoices && order.invoices.length > 0) {
      await prisma.invoice.update({
        where: { id: order.invoices[0].id },
        data: {
          refundStatus: `Return ${rmaCode} authorized. Full refund of $${Number(order.totalAmount).toFixed(2)} scheduled upon return package delivery & warehouse inspection.`,
        },
      });
    }

    return {
      success: true,
      message: `Return request authorized for ${orderNumber}. RMA Code: ${rmaCode}.`,
      data: {
        orderNumber,
        rmaCode,
        status: "RETURN_AUTHORIZED",
        refundAmount: Number(order.totalAmount),
        returnLabelCarrier: "Prepaid FedEx Return Label",
        instructions: "Pack the item in its original box, affix the prepaid FedEx label, and hand off to any FedEx location or drop box.",
      },
    };
  },

  cancelOrder: async (args: { orderNumber: string; reason?: string }): Promise<OrderToolResult> => {
    const orderNumber = args.orderNumber.trim().toUpperCase();
    const order = await prisma.order.findUnique({ where: { orderNumber } });

    if (!order) {
      return { success: false, message: `Order "${orderNumber}" not found.` };
    }

    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.SHIPPED) {
      return {
        success: false,
        message: `Order ${orderNumber} cannot be cancelled because it is already "${order.status}". Please wait for delivery and initiate an RMA return within our 30-day window.`,
      };
    }

    if (order.status === OrderStatus.CANCELLED) {
      return { success: true, message: `Order ${orderNumber} is already cancelled.` };
    }

    const updated = await prisma.order.update({
      where: { orderNumber },
      data: { status: OrderStatus.CANCELLED },
    });

    return {
      success: true,
      message: `Order ${orderNumber} has been successfully cancelled. No charges were captured.`,
      data: { orderNumber: updated.orderNumber, status: updated.status },
    };
  },
};
