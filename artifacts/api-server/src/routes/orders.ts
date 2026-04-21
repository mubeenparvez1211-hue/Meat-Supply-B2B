import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, customersTable, productsTable } from "@workspace/db";
import {
  ListOrdersQueryParams,
  ListOrdersResponse,
  CreateOrderBody,
  GetOrderParams,
  GetOrderResponse,
  DeleteOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  UpdateOrderStatusResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function loadOrderById(id: number) {
  const [row] = await db
    .select({
      order: ordersTable,
      customerName: customersTable.businessName,
    })
    .from(ordersTable)
    .leftJoin(customersTable, eq(customersTable.id, ordersTable.customerId))
    .where(eq(ordersTable.id, id));
  if (!row) return null;
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
  return {
    id: row.order.id,
    customerId: row.order.customerId,
    customerName: row.customerName ?? "Unknown",
    status: row.order.status,
    deliveryDate: row.order.deliveryDate,
    totalCents: row.order.totalCents,
    notes: row.order.notes,
    items: items.map((it) => ({
      id: it.id,
      productId: it.productId,
      productName: it.productName,
      quantityKg: it.quantityKg,
      pricePerKgCents: it.pricePerKgCents,
      lineTotalCents: it.lineTotalCents,
    })),
    createdAt: row.order.createdAt,
  };
}

router.get("/orders", async (req, res): Promise<void> => {
  const q = ListOrdersQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const conditions = [];
  if (q.data.status) conditions.push(eq(ordersTable.status, q.data.status));
  if (q.data.customerId !== undefined) conditions.push(eq(ordersTable.customerId, q.data.customerId));

  const orders = conditions.length
    ? await db
        .select({ order: ordersTable, customerName: customersTable.businessName })
        .from(ordersTable)
        .leftJoin(customersTable, eq(customersTable.id, ordersTable.customerId))
        .where(and(...conditions))
        .orderBy(desc(ordersTable.createdAt))
    : await db
        .select({ order: ordersTable, customerName: customersTable.businessName })
        .from(ordersTable)
        .leftJoin(customersTable, eq(customersTable.id, ordersTable.customerId))
        .orderBy(desc(ordersTable.createdAt));

  const ids = orders.map((o) => o.order.id);
  const allItems = ids.length
    ? await db.select().from(orderItemsTable)
    : [];
  const itemsByOrder = new Map<number, typeof allItems>();
  for (const it of allItems) {
    const arr = itemsByOrder.get(it.orderId) ?? [];
    arr.push(it);
    itemsByOrder.set(it.orderId, arr);
  }

  const result = orders.map(({ order, customerName }) => ({
    id: order.id,
    customerId: order.customerId,
    customerName: customerName ?? "Unknown",
    status: order.status,
    deliveryDate: order.deliveryDate,
    totalCents: order.totalCents,
    notes: order.notes,
    items: (itemsByOrder.get(order.id) ?? []).map((it) => ({
      id: it.id,
      productId: it.productId,
      productName: it.productName,
      quantityKg: it.quantityKg,
      pricePerKgCents: it.pricePerKgCents,
      lineTotalCents: it.lineTotalCents,
    })),
    createdAt: order.createdAt,
  }));

  res.json(ListOrdersResponse.parse(result));
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { customerId, deliveryDate, notes, items } = parsed.data;
  if (items.length === 0) {
    res.status(400).json({ error: "Order must have at least one line item" });
    return;
  }

  const productIds = Array.from(new Set(items.map((i) => i.productId)));
  const products = await db.select().from(productsTable);
  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const pid of productIds) {
    if (!productMap.has(pid)) {
      res.status(400).json({ error: `Product ${pid} not found` });
      return;
    }
  }

  const lineItems = items.map((it) => {
    const p = productMap.get(it.productId)!;
    const lineTotalCents = Math.round(p.pricePerKgCents * it.quantityKg);
    return {
      productId: it.productId,
      productName: p.name,
      quantityKg: it.quantityKg,
      pricePerKgCents: p.pricePerKgCents,
      lineTotalCents,
    };
  });
  const totalCents = lineItems.reduce((s, i) => s + i.lineTotalCents, 0);

  const deliveryDateStr =
    deliveryDate instanceof Date ? deliveryDate.toISOString().slice(0, 10) : String(deliveryDate);
  const [order] = await db
    .insert(ordersTable)
    .values({ customerId, deliveryDate: deliveryDateStr, notes, totalCents, status: "pending" })
    .returning();

  await db.insert(orderItemsTable).values(lineItems.map((li) => ({ ...li, orderId: order.id })));

  const full = await loadOrderById(order.id);
  res.status(201).json(GetOrderResponse.parse(full));
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const order = await loadOrderById(params.data.id);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(GetOrderResponse.parse(order));
});

router.patch("/orders/:id/status", async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(ordersTable)
    .set({ status: parsed.data.status })
    .where(eq(ordersTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const full = await loadOrderById(updated.id);
  res.json(UpdateOrderStatusResponse.parse(full));
});

router.delete("/orders/:id", async (req, res): Promise<void> => {
  const params = DeleteOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, params.data.id));
  await db.delete(ordersTable).where(eq(ordersTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
