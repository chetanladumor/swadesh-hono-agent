import { Hono } from "hono";
import { prisma } from "../db/prisma.js";

export const userRoutes = new Hono().get("/users", async (c) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      address: true,
      _count: {
        select: { orders: true, invoices: true, conversations: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return c.json({ success: true, data: users });
});
