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
      return { success: true, message: "No orders found for your account.", data: [] };
    }

    return {
      success: true,
      message: `Found ${orders.length} orders associated with your account.`,
      data: orders.map((o) => ({
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        carrier: o.carrier,
        trackingNumber: o.trackingNumber,
        estimatedDelivery: o.estimatedDelivery ? o.estimatedDelivery.toISOString() : null,
        itemsCount: o.items.length,
        itemsSummary: o.items.map((i) => `${i.quantity}x ${i.productName}`).join(", "),
        createdAt: o.createdAt.toISOString(),
      })),
    };
  },

  fetchOrderDetails: async (args: { orderNumber: string; userId?: string }): Promise<OrderToolResult> => {
    const orderNumber = args.orderNumber.trim().toUpperCase();
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        user: { select: { name: true, email: true } },
      },
    });

    if (!order) {
      return {
        success: false,
        message: `Order "${orderNumber}" was not found in the database. Please verify the order number.`,
      };
    }

    return {
      success: true,
      message: `Order ${order.orderNumber} is currently ${order.status}.`,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        shippingAddress: order.shippingAddress,
        carrier: order.carrier,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery ? order.estimatedDelivery.toISOString() : null,
        items: order.items.map((it) => ({
          product: it.productName,
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice),
        })),
        createdAt: order.createdAt.toISOString(),
      },
    };
  },

  initiateReturn: async (args: { orderNumber: string; reason?: string }): Promise<OrderToolResult> => {
    const orderNumber = args.orderNumber.trim().toUpperCase();
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });

    if (!order) {
      return {
        success: false,
        message: `Cannot initiate return. Order "${orderNumber}" not found in system.`,
      };
    }

    // Check delivery status
    if (order.status !== OrderStatus.DELIVERED) {
      return {
        success: false,
        message: `Order ${orderNumber} is currently "${order.status}". Returns can only be initiated after the package is DELIVERED. If you wish to stop the shipment, you may request an address change or order cancellation before dispatch.`,
      };
    }

    // Check 30-day window
    const daysSinceDelivery = Math.floor((Date.now() - order.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceDelivery > 30) {
      return {
        success: false,
        message: `Order ${orderNumber} was delivered ${daysSinceDelivery} days ago, which exceeds our 30-day return window. Please contact support if this is a warranty defect.`,
      };
    }

    const rmaCode = `RMA-${Math.floor(100000 + Math.random() * 900000)}`;

    return {
      success: true,
      message: `Return merchandise authorization generated successfully (Return Code: ${rmaCode}).`,
      data: {
        orderNumber: order.orderNumber,
        rmaCode,
        status: "RETURN_AUTHORIZED",
        refundAmount: Number(order.totalAmount),
        returnLabelCarrier: "Prepaid FedEx Return Label",
        returnInstructions: "1. Pack item in original packaging with all accessories. 2. Affix prepaid return label. 3. Drop off at any FedEx location. Once inspected at our fulfillment center, a full refund will be credited to your original payment method within 3-5 business days.",
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
      return {
        success: false,
        message: `Cannot check delivery status. Order "${orderNumber}" not found.`,
      };
    }

    let deliveryMessage = "";
    if (order.status === OrderStatus.DELIVERED) {
      deliveryMessage = `Delivered on ${order.updatedAt.toDateString()} via ${order.carrier || "Standard Courier"}.`;
    } else if (order.status === OrderStatus.SHIPPED) {
      deliveryMessage = `Shipped with ${order.carrier || "Carrier"} (Tracking: ${order.trackingNumber || "N/A"}). Estimated arrival: ${order.estimatedDelivery ? order.estimatedDelivery.toDateString() : "2-3 days"}.`;
    } else if (order.status === OrderStatus.PROCESSING) {
      deliveryMessage = "Order is currently being packed in our fulfillment center. It has not shipped yet.";
    } else if (order.status === OrderStatus.CANCELLED) {
      deliveryMessage = "This order was cancelled. No delivery is scheduled.";
    } else {
      deliveryMessage = "Order is pending payment confirmation.";
    }

    return {
      success: true,
      message: deliveryMessage,
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

  cancelOrder: async (args: { orderNumber: string; reason?: string }): Promise<OrderToolResult> => {
    const orderNumber = args.orderNumber.trim().toUpperCase();
    const order = await prisma.order.findUnique({ where: { orderNumber } });

    if (!order) {
      return {
        success: false,
        message: `Cannot cancel order. Order "${orderNumber}" does not exist.`,
      };
    }

    if (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
      return {
        success: false,
        message: `Order ${orderNumber} cannot be cancelled because it is already ${order.status}. You may initiate a return within 30 days after receiving the item.`,
      };
    }

    if (order.status === OrderStatus.CANCELLED) {
      return {
        success: true,
        message: `Order ${orderNumber} is already cancelled.`,
      };
    }

    const updated = await prisma.order.update({
      where: { orderNumber },
      data: { status: OrderStatus.CANCELLED },
    });

    return {
      success: true,
      message: `Order ${orderNumber} has been successfully cancelled.` + (args.reason ? ` Reason recorded: "${args.reason}".` : ""),
      data: {
        orderNumber: updated.orderNumber,
        newStatus: updated.status,
      },
    };
  },

  modifyShippingAddress: async (args: { orderNumber: string; newAddress: string }): Promise<OrderToolResult> => {
    const orderNumber = args.orderNumber.trim().toUpperCase();
    const order = await prisma.order.findUnique({ where: { orderNumber } });

    if (!order) {
      return {
        success: false,
        message: `Cannot update address. Order "${orderNumber}" not found.`,
      };
    }

    if (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
      return {
        success: false,
        message: `Cannot change shipping address for order ${orderNumber} because it is already ${order.status}. Please contact the carrier (${order.carrier || "courier"}) directly with tracking #${order.trackingNumber || "N/A"}.`,
      };
    }

    const updated = await prisma.order.update({
      where: { orderNumber },
      data: { shippingAddress: args.newAddress.trim() },
    });

    return {
      success: true,
      message: `Shipping address for order ${orderNumber} has been successfully updated to: "${updated.shippingAddress}".`,
      data: {
        orderNumber: updated.orderNumber,
        newAddress: updated.shippingAddress,
      },
    };
  },
};
