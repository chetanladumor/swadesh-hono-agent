
import fs from "fs";

const seedContent = `import { PrismaClient, OrderStatus, InvoiceStatus, Role, AgentType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clean existing records in correct relation order
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.order.deleteMany();
  await prisma.knowledgeBase.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Primary Test User
  const user = await prisma.user.create({
    data: {
      id: "user_chetan_1",
      email: "ladumorchetan@yahoo.com",
      name: "ChetanKumar Ladumor",
      phone: "+1 (555) 234-5678",
      address: "452 Innovation Way, Suite 800, San Francisco, CA 94107",
    },
  });

  console.log("✅ Seeded User:", user.name);

  // 2. Create Orders
  const now = new Date();
  const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

  const order1 = await prisma.order.create({
    data: {
      orderNumber: "ORDER-1001",
      userId: user.id,
      status: OrderStatus.SHIPPED,
      totalAmount: 1199.00,
      shippingAddress: user.address,
      trackingNumber: "FEDEX-94829103",
      carrier: "FedEx Express",
      estimatedDelivery: twoDaysLater,
      items: {
        create: [
          {
            productName: "iPhone 16 Pro 256GB - Natural Titanium",
            quantity: 1,
            unitPrice: 1199.00,
          },
        ],
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      orderNumber: "ORDER-1002",
      userId: user.id,
      status: OrderStatus.DELIVERED,
      totalAmount: 399.00,
      shippingAddress: user.address,
      trackingNumber: "UPS-83920194",
      carrier: "UPS Ground",
      estimatedDelivery: yesterday,
      items: {
        create: [
          {
            productName: "Sony WH-1000XM5 Wireless Headphones (Black)",
            quantity: 1,
            unitPrice: 399.00,
          },
        ],
      },
    },
  });

  const order3 = await prisma.order.create({
    data: {
      orderNumber: "ORDER-1003",
      userId: user.id,
      status: OrderStatus.PROCESSING,
      totalAmount: 3499.00,
      shippingAddress: user.address,
      trackingNumber: null,
      carrier: "Pending Logistics Assignment",
      estimatedDelivery: fiveDaysLater,
      items: {
        create: [
          {
            productName: "MacBook Pro 16 inch (M3 Max, 64GB RAM, 1TB SSD)",
            quantity: 1,
            unitPrice: 3499.00,
          },
        ],
      },
    },
  });

  const order4 = await prisma.order.create({
    data: {
      orderNumber: "ORDER-1004",
      userId: user.id,
      status: OrderStatus.CANCELLED,
      totalAmount: 99.00,
      shippingAddress: user.address,
      items: {
        create: [
          {
            productName: "Logitech MX Master 3S Wireless Mouse",
            quantity: 1,
            unitPrice: 99.00,
          },
        ],
      },
    },
  });

  console.log("✅ Seeded Orders: ORDER-1001, ORDER-1002, ORDER-1003, ORDER-1004");

  // 3. Create Invoices
  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2024-001",
      userId: user.id,
      orderId: order1.id,
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
      userId: user.id,
      orderId: order2.id,
      amount: 399.00,
      status: InvoiceStatus.REFUNDED,
      paymentMethod: "Credit Card (Visa **** 4242)",
      refundStatus: "Full refund of $399.00 completed to Visa **** 4242",
      refundAmount: 399.00,
      dueDate: yesterday,
      paidAt: yesterday,
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2024-003",
      userId: user.id,
      orderId: order3.id,
      amount: 3499.00,
      status: InvoiceStatus.PAID,
      paymentMethod: "Mastercard (**** 9123)",
      dueDate: now,
      paidAt: now,
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2024-004",
      userId: user.id,
      amount: 49.00,
      status: InvoiceStatus.PAID,
      paymentMethod: "Corporate Amex (**** 1004)",
      dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      paidAt: now,
    },
  });

  console.log("✅ Seeded Invoices: INV-2024-001, INV-2024-002, INV-2024-003, INV-2024-004");

  // 4. Create Knowledge Base Articles
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
  console.log("✅ Seeded Knowledge Base Articles");

  // 5. Seed an Initial Conversation Thread
  const sampleConv = await prisma.conversation.create({
    data: {
      id: "conv_sample_1",
      userId: user.id,
      title: "Delivery Status for iPhone 16 Pro",
      messages: {
        create: [
          {
            role: Role.user,
            content: "Hi! Can you tell me when my iPhone 16 Pro (ORDER-1001) will arrive?",
            agentType: AgentType.ROUTER,
          },
          {
            role: Role.assistant,
            content: "Hello Chetan! Your order ORDER-1001 containing the iPhone 16 Pro 256GB has been shipped via FedEx Express with tracking number FEDEX-94829103. It is currently on schedule and estimated to arrive in 2 business days at your address: 452 Innovation Way, Suite 800, San Francisco, CA 94107.",
            agentType: AgentType.ORDER,
            reasoningSteps: [
              {
                id: "step_1",
                stage: "routing",
                agent: "ROUTER",
                thought: "User is asking about tracking and delivery status for ORDER-1001. Classifying intent as ORDER.",
                timestamp: now.toISOString(),
              },
              {
                id: "step_2",
                stage: "tool_execution",
                agent: "ORDER",
                thought: "Calling checkDeliveryStatus tool for orderNumber: ORDER-1001",
                timestamp: now.toISOString(),
                toolCall: {
                  id: "call_seed_1",
                  name: "checkDeliveryStatus",
                  args: { orderNumber: "ORDER-1001" },
                  result: {
                    status: "SHIPPED",
                    carrier: "FedEx Express",
                    trackingNumber: "FEDEX-94829103",
                    estimatedDelivery: twoDaysLater.toISOString(),
                  },
                  timestamp: now.toISOString(),
                },
              },
            ],
          },
        ],
      },
    },
  });

  console.log("✅ Seeded Sample Conversation:", sampleConv.id);
  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;

fs.writeFileSync("apps/backend/prisma/seed.ts", seedContent.trim());
console.log("Wrote apps/backend/prisma/seed.ts successfully");
