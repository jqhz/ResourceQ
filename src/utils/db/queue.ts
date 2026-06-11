import { asc, eq, inArray } from "drizzle-orm";
import { db } from "./index";
import {
  queuedCards,
  queuedCardCategories,
  queuedPlaylistCards,
} from "../schema";
import type { CardInput, CardItem, CategorySlug } from "../types";
import { orderCategoriesWithPrimary } from "../id";
import { upsertCard } from "./cards";

const toQueuedCard = (
  row: typeof queuedCards.$inferSelect,
  categories: CategorySlug[],
  playlistIds: string[],
): CardItem => ({
  id: row.id,
  categories,
  playlistIds,
  title: row.title,
  description: row.description ?? undefined,
  image: row.image ?? undefined,
  date: row.date ?? undefined,
  recommended: row.recommended,
  url: row.url,
});

export const listQueuedCards = async (): Promise<CardItem[]> => {
  const cardRows = await db
    .select()
    .from(queuedCards)
    .orderBy(asc(queuedCards.createdAt));

  if (cardRows.length === 0) return [];

  const cardIds = cardRows.map((row) => row.id);
  const [categoryRows, playlistRows] = await Promise.all([
    db
      .select()
      .from(queuedCardCategories)
      .where(inArray(queuedCardCategories.queuedCardId, cardIds)),
    db
      .select()
      .from(queuedPlaylistCards)
      .where(inArray(queuedPlaylistCards.queuedCardId, cardIds)),
  ]);

  const categoriesByCard = new Map<string, CategorySlug[]>();
  for (const row of categoryRows) {
    const list = categoriesByCard.get(row.queuedCardId) ?? [];
    list.push(row.categorySlug);
    categoriesByCard.set(row.queuedCardId, list);
  }

  const playlistsByCard = new Map<string, string[]>();
  for (const row of playlistRows) {
    const list = playlistsByCard.get(row.queuedCardId) ?? [];
    list.push(row.playlistId);
    playlistsByCard.set(row.queuedCardId, list);
  }

  return cardRows.map((row) =>
    toQueuedCard(
      row,
      orderCategoriesWithPrimary(
        row.id,
        categoriesByCard.get(row.id) ?? [],
      ),
      playlistsByCard.get(row.id) ?? [],
    ),
  );
};

export const getAllQueuedCardIds = async (): Promise<string[]> => {
  const rows = await db.select({ id: queuedCards.id }).from(queuedCards);
  return rows.map((row) => row.id);
};

const syncQueuedRelations = async (input: CardInput) => {
  await db
    .delete(queuedCardCategories)
    .where(eq(queuedCardCategories.queuedCardId, input.id));
  if (input.categories.length > 0) {
    await db.insert(queuedCardCategories).values(
      input.categories.map((categorySlug) => ({
        queuedCardId: input.id,
        categorySlug,
      })),
    );
  }

  await db
    .delete(queuedPlaylistCards)
    .where(eq(queuedPlaylistCards.queuedCardId, input.id));
  if (input.playlistIds.length > 0) {
    await db.insert(queuedPlaylistCards).values(
      input.playlistIds.map((playlistId) => ({
        queuedCardId: input.id,
        playlistId,
      })),
    );
  }
};

export const createQueuedCard = async (input: CardInput) => {
  await db.insert(queuedCards).values({
    id: input.id,
    title: input.title,
    description: input.description,
    image: input.image,
    date: input.date,
    recommended: input.recommended ?? false,
    url: input.url,
  });

  await syncQueuedRelations(input);
};

export const updateQueuedCard = async (input: CardInput) => {
  await db
    .update(queuedCards)
    .set({
      title: input.title,
      description: input.description,
      image: input.image,
      date: input.date,
      recommended: input.recommended ?? false,
      url: input.url,
    })
    .where(eq(queuedCards.id, input.id));

  await syncQueuedRelations(input);
};

export const deleteQueuedCard = async (id: string) => {
  await db.delete(queuedCards).where(eq(queuedCards.id, id));
};

export const acceptQueuedCard = async (input: CardInput) => {
  await upsertCard(input);
  await deleteQueuedCard(input.id);
};
