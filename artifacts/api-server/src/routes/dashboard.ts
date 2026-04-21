import { Router, type IRouter } from "express";
import { eq, sql, desc, lt } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, customersTable, productsTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetRecentOrdersResponse,
  GetTopProductsResponse,
  GetLowStockResponse,
  GetSalesByCategoryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const LOW_STOCK_THRESHOLD = 25;

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [revenueRow] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${ordersTable.totalCents}), 0)::int`,
    })
    .from(ordersTable);

  const [thisMonthRow] = await db
    .select({
      orders: sql<number>`COUNT(*)::int`,
      revenue: sql<number>`COALESCE(SUM(${ordersTable.totalCents}), 0)::int`,
    })
    .from(ordersTable)
    .where(sql`${ordersTable.createdAt} >= ${monthStart.toISOString()}`);

  const [lastMonthRow] = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(${ordersTable.totalCents}), 0)::int`,
    })
    .from(ordersTable)
    .where(
      sql`${ordersTable.createdAt} >= ${lastMonthStart.toISOString()} AND ${ordersTable.createdAt} < ${monthStart.toISOString()}`,
    );

  const [customersRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(customersTable);

  const [pendingRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(ordersTable)
    .where(eq(ordersTable.status, "pending"));

  const [productsRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(productsTable);

  const [lowStockRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(productsTable)
    .where(lt(productsTable.stockKg, LOW_STOCK_THRESHOLD));

  const lastRev = lastMonthRow?.revenue ?? 0;
  const thisRev = thisMonthRow?.revenue ?? 0;
  const revenueChangePct =
    lastRev === 0 ? (thisRev > 0 ? 100 : 0) : ((thisRev - lastRev) / lastRev) * 100;

  const data = {
    totalRevenueCents: revenueRow?.total ?? 0,
    ordersThisMonth: thisMonthRow?.orders ?? 0,
    activeCustomers: customersRow?.count ?? 0,
    pendingOrders: pendingRow?.count ?? 0,
    totalProducts: productsRow?.count ?? 0,
    lowStockCount: lowStockRow?.count ?? 0,
    revenueChangePct: Math.round(revenueChangePct * 10) / 10,
  };

  res.json(GetDashboardSummaryResponse.parse(data));
});

router.get("/dashboard/recent-orders", async (_req, res): Promise<void> => {
  const orders = await db
    .select({ order: ordersTable, customerName: customersTable.businessName })
    .from(ordersTable)
    .leftJoin(customersTable, eq(customersTable.id, ordersTable.customerId))
    .orderBy(desc(ordersTable.createdAt))
    .limit(8);

  const ids = orders.map((o) => o.order.id);
  const items = ids.length ? await db.select().from(orderItemsTable) : [];
  const itemsByOrder = new Map<number, typeof items>();
  for (const it of items) {
    const arr = itemsByOrder.get(it.orderId) ?? [];
    arr.push(it);
    itemsByOrder.set(it.orderId, arr);
  }

  const data = orders.map(({ order, customerName }) => ({
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

  res.json(GetRecentOrdersResponse.parse(data));
});

router.get("/dashboard/top-products", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      productId: orderItemsTable.productId,
      productName: orderItemsTable.productName,
      category: productsTable.category,
      totalKg: sql<number>`COALESCE(SUM(${orderItemsTable.quantityKg}), 0)::float`,
      totalRevenueCents: sql<number>`COALESCE(SUM(${orderItemsTable.lineTotalCents}), 0)::int`,
    })
    .from(orderItemsTable)
    .leftJoin(productsTable, eq(productsTable.id, orderItemsTable.productId))
    .groupBy(orderItemsTable.productId, orderItemsTable.productName, productsTable.category)
    .orderBy(desc(sql`SUM(${orderItemsTable.lineTotalCents})`))
    .limit(6);

  const data = rows.map((r) => ({
    productId: r.productId,
    productName: r.productName,
    category: r.category ?? "unknown",
    totalKg: r.totalKg,
    totalRevenueCents: r.totalRevenueCents,
  }));
  res.json(GetTopProductsResponse.parse(data));
});

router.get("/dashboard/low-stock", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(productsTable)
    .where(lt(productsTable.stockKg, LOW_STOCK_THRESHOLD))
    .orderBy(productsTable.stockKg);
  res.json(GetLowStockResponse.parse(rows));
});

router.get("/dashboard/sales-by-category", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      category: productsTable.category,
      totalKg: sql<number>`COALESCE(SUM(${orderItemsTable.quantityKg}), 0)::float`,
      totalRevenueCents: sql<number>`COALESCE(SUM(${orderItemsTable.lineTotalCents}), 0)::int`,
      orderCount: sql<number>`COUNT(DISTINCT ${orderItemsTable.orderId})::int`,
    })
    .from(orderItemsTable)
    .leftJoin(productsTable, eq(productsTable.id, orderItemsTable.productId))
    .groupBy(productsTable.category)
    .orderBy(desc(sql`SUM(${orderItemsTable.lineTotalCents})`));

  const data = rows.map((r) => ({
    category: r.category ?? "unknown",
    totalKg: r.totalKg,
    totalRevenueCents: r.totalRevenueCents,
    orderCount: r.orderCount,
  }));

  res.json(GetSalesByCategoryResponse.parse(data));
});

export default router;
