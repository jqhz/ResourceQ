import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  primaryKey,
  foreignKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const categorySlugEnum = pgEnum("category_slug", [
  "tutorials",
  "tech",
  "documents",
  "downloads",
  "apps-tools",
  "discords",
  "youtube",
  "fanart",
]);

export const categories = pgTable("categories", {
  slug: categorySlugEnum("slug").primaryKey(),
  label: text("label").notNull(),
});

export const playlists = pgTable(
  "playlists",
  {
    id: text("id").primaryKey(),
    categorySlug: categorySlugEnum("category_slug")
      .notNull()
      .references(() => categories.slug, { onDelete: "restrict" }),
    parentPlaylistId: text("parent_playlist_id"),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    position: integer("position").notNull().default(0),
    image: text("image").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.parentPlaylistId],
      foreignColumns: [table.id],
      name: "playlists_parent_playlist_id_fkey",
    }).onDelete("cascade"),
    uniqueIndex("playlists_category_slug_slug_unique").on(
      table.categorySlug,
      table.slug,
    ),
  ],
);

export const cards = pgTable("cards", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  image: text("image"),
  date: text("date"),
  recommended: boolean("recommended").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  url: text("url").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const queuedCards = pgTable("queued_cards", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  image: text("image"),
  date: text("date"),
  recommended: boolean("recommended").notNull().default(false),
  url: text("url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const playlistCards = pgTable(
  "playlist_cards",
  {
    playlistId: text("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.playlistId, t.cardId] }),
  })
);

export const cardCategories = pgTable(
  "card_categories",
  {
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    categorySlug: categorySlugEnum("category_slug")
      .notNull()
      .references(() => categories.slug, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.cardId, t.categorySlug] }),
  })
);

export const queuedCardCategories = pgTable(
  "queued_card_categories",
  {
    queuedCardId: text("queued_card_id")
      .notNull()
      .references(() => queuedCards.id, { onDelete: "cascade" }),
    categorySlug: categorySlugEnum("category_slug")
      .notNull()
      .references(() => categories.slug, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.queuedCardId, t.categorySlug] }),
  })
);

export const queuedPlaylistCards = pgTable(
  "queued_playlist_cards",
  {
    playlistId: text("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    queuedCardId: text("queued_card_id")
      .notNull()
      .references(() => queuedCards.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.playlistId, t.queuedCardId] }),
  })
);