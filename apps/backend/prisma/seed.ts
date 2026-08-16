import { PrismaClient, OrderStatus, InvoiceStatus, Role, AgentType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting multi-user database seeding...");

  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.order.deleteMany();
  await prisma.knowledgeBase.deleteMany();
  await prisma.user.deleteMany();

  const now = new Date();
  const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

  // USER 1: ChetanKumar Ladumor
  const user1 = await prisma.user.create({
    data: {
      id: "user_chetan_1",
      email: "ladumorchetan@yahoo.com",
      name: "ChetanKumar Ladumor",
      phone: "+1 (555) 234-5678",
      address: "452 Innovation Way, Suite 800, San Francisco, CA 94107",
    },
  });

  const u1_order1 = await prisma.order.create({
    data: {
      orderNumber: "ORDER-1001",
      userId: user1.id,
      status: OrderStatus.SHIPPED,
      totalAmount: 1199.00,
      shippingAddress: user1.address!,
      trackingNumber: "FEDEX-94829103",
      carrier: "FedEx Express",
      estimatedDelivery: twoDaysLater,
      items: {
        create: [{ productName: "iPhone 16 Pro 256GB - Natural Titanium", quantity: 1, unitPrice: 1199.00 }],
      },
    },
  });

  const u1_order2 = await prisma.order.create({
    data: {
      orderNumber: "ORDER-1002",
      userId: user1.id,
      status: OrderStatus.DELIVERED,
      totalAmount: 399.00,
      shippingAddress: user1.address!,
      trackingNumber: "UPS-83920194",
      carrier: "UPS Ground",
      estimatedDelivery: yesterday,
      items: {
        create: [{ productName: "Sony WH-1000XM5 Wireless Headphones (Black)", quantity: 1, unitPrice: 399.00 }],
      },
    },
  });

  const u1_order3 = await prisma.order.create({
    data: {
      orderNumber: "ORDER-1003",
      userId: user1.id,
      status: OrderStatus.PROCESSING,
      totalAmount: 3499.00,
      shippingAddress: user1.address!,
      trackingNumber: null,
      carrier: "Pending Logistics Assignment",
      estimatedDelivery: fiveDaysLater,
      items: {
        create: [{ productName: "MacBook Pro 16 inch (M3 Max, 64GB RAM, 1TB SSD)", quantity: 1, unitPrice: 3499.00 }],
      },
    },
  });

  await prisma.order.create({
    data: {
      orderNumber: "ORDER-1004",
      userId: user1.id,
      status: OrderStatus.CANCELLED,
      totalAmount: 99.00,
      shippingAddress: user1.address!,
      items: {
        create: [{ productName: "Logitech MX Master 3S Wireless Mouse", quantity: 1, unitPrice: 99.00 }],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2024-001",
      userId: user1.id,
      orderId: u1_order1.id,
      amount: 1199.00,
      status: InvoiceStatus.PAID,
      paymentMethod: "Apple Pay (Visa **** 8821)",
      dueDate: now,
      paidAt: now,
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2024-002",
      userId: user1.id,
      orderId: u1_order2.id,
      amount: 399.00,
      status: InvoiceStatus.REFUNDED,
      paymentMethod: "Credit Card (Visa **** 4242)",
      refundStatus: "Full refund of $399.00 completed to Visa **** 4242",
      refundAmount: 399.00,
      dueDate: yesterday,
      paidAt: yesterday,
    },
  });

  // USER 2: Sarah Jenkins (Different customer with iPad order)
  const user2 = await prisma.user.create({
    data: {
      id: "user_sarah_2",
      email: "sarah.jenkins@example.com",
      name: "Sarah Jenkins",
      phone: "+1 (555) 876-5432",
      address: "1200 Market Street, Apt 4B, Austin, TX 78701",
    },
  });

  const u2_order1 = await prisma.order.create({
    data: {
      orderNumber: "ORDER-2001",
      userId: user2.id,
      status: OrderStatus.SHIPPED,
      totalAmount: 999.00,
      shippingAddress: user2.address!,
      trackingNumber: "DHL-55829104",
      carrier: "DHL Express",
      estimatedDelivery: twoDaysLater,
      items: {
        create: [{ productName: "iPad Pro 13 inch M4 (256GB)", quantity: 1, unitPrice: 999.00 }],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2024-101",
      userId: user2.id,
      orderId: u2_order1.id,
      amount: 999.00,
      status: InvoiceStatus.PAID,
      paymentMethod: "Credit Card (Mastercard **** 3311)",
      dueDate: now,
      paidAt: now,
    },
  });

  // USER 3: Michael Chang (Enterprise Subscriber)
  const user3 = await prisma.user.create({
    data: {
      id: "user_michael_3",
      email: "m.chang@cloudscale.io",
      name: "Michael Chang",
      phone: "+1 (555) 443-9988",
      address: "88 Pine Street, Floor 14, Seattle, WA 98101",
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2024-201",
      userId: user3.id,
      amount: 499.00,
      status: InvoiceStatus.PAID,
      paymentMethod: "Corporate Amex (**** 9002)",
      dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      paidAt: now,
    },
  });

  // Knowledge Base
  const kbArticles = [
    {
      category: "Return & Refund Policy",
      title: "Return Window and Refund Procedure",
      content: "Customers have a 30-day return window from the date of package delivery. All items must be in original condition with intact packaging. Refunds are processed within 3-5 business days back to the original payment method after the return is received and inspected.",
      keywords: ["return", "refund", "policy", "window", "30 days", "money back"],
    },
    {
      category: "Shipping & Delivery",
      title: "Delivery Timelines and Carrier Information",
      content: "Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days. Real-time GPS and milestone tracking are available via FedEx or UPS tracking numbers once the order status transitions to SHIPPED.",
      keywords: ["shipping", "delivery", "carrier", "fedex", "ups", "tracking", "timeline"],
    },
    {
      category: "Order Management",
      title: "Order Modifications and Cancellation Guidelines",
      content: "Orders can be cancelled or delivery addresses updated free of charge as long as the status is PENDING or PROCESSING. Once an order is SHIPPED, address modifications must be requested directly through the carrier.",
      keywords: ["cancel", "cancellation", "change address", "modify", "shipping address"],
    },
    {
      category: "Warranty & Support",
      title: "Hardware Warranty & Troubleshooting Procedures",
      content: "All electronics and computing devices include a comprehensive 1-year manufacturer warranty covering hardware defects. For troubleshooting bluetooth or power issues, performing a 10-second factory reset resolves 90% of connectivity problems.",
      keywords: ["warranty", "defective", "broken", "troubleshoot", "repair", "reset", "bluetooth"],
    },
    {
      category: "Billing & Subscriptions",
      title: "Subscription Management & Invoicing",
      content: "Subscriptions renew automatically on the 1st of each calendar month. Invoices and PDF tax receipts are available immediately in the billing dashboard. To request tax exemption or update payment methods, contact billing.",
      keywords: ["subscription", "billing", "invoice", "receipt", "tax", "renewal"],
    },
  ];

  for (const article of kbArticles) {
    await prisma.knowledgeBase.create({ data: article });
  }

  console.log("✅ Seeded 3 Customers (ChetanKumar, Sarah, Michael) with distinct orders & invoices!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
