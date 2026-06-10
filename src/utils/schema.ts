import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const mainItems = pgTable("main_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const queueItems = pgTable("queue_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});