import { pgTable, serial, text, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  cut: text("cut").notNull(),
  origin: text("origin").notNull(),
  grade: text("grade").notNull(),
  pricePerKgCents: integer("price_per_kg_cents").notNull(),
  stockKg: doublePrecision("stock_kg").notNull(),
  unit: text("unit").notNull().default("kg"),
  imageUrl: text("image_url").notNull().default(""),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Product = typeof productsTable.$inferSelect;
export type InsertProduct = typeof productsTable.$inferInsert;
