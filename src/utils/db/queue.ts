import { asc, eq } from "drizzle-orm";
import { db } from "./index";
import {
  cards,
  cardCategories,
  playlistCards,
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
  categoryPositions: {},
  playlistPositions: {},
  title: row.title,
  description: row.description ?? undefined,
  image: row.image ?? undefined,
  date: row.date ?? undefined,
  recommended: row.recommended,
  archived: false,
  url: row.url,
});

export const listQueuedCards = async (): Promise<CardItem[]> => {
  const [cardRows, categoryRows, playlistRows] = await Promise.all([
    db.select().from(queuedCards).orderBy(asc(queuedCards.createdAt)),
    db.select().from(queuedCardCategories),
    db.select().from(queuedPlaylistCards),
  ]);

  if (cardRows.length === 0) return [];

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

export type AcceptQueuedCardResult = {
  targetId: string;
  mergedIntoExisting: boolean;
};

export type AcceptAllQueuedCardsResult = {
  accepted: number;
  merged: number;
  skipped: number;
  failed: number;
  errors: string[];
};

const queuedCardToInput = (card: CardItem): CardInput => ({
  id: card.id,
  categories: card.categories,
  playlistIds: card.playlistIds,
  categoryPositions: card.categoryPositions,
  playlistPositions: card.playlistPositions,
  title: card.title.trim(),
  description: card.description?.trim() || undefined,
  image: card.image?.trim() || undefined,
  date: card.date?.trim() || undefined,
  recommended: card.recommended,
  url: card.url.trim(),
});

const isAcceptableQueuedCard = (card: CardItem) =>
  Boolean(card.title.trim()) &&
  Boolean(card.url.trim()) &&
  (card.categories.length > 0 || card.playlistIds.length > 0);

export const acceptAllQueuedCards = async (): Promise<AcceptAllQueuedCardsResult> => {
  const cards = await listQueuedCards();
  let accepted = 0;
  let merged = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const card of cards) {
    if (!isAcceptableQueuedCard(card)) {
      skipped += 1;
      continue;
    }

    try {
      const result = await acceptQueuedCard(queuedCardToInput(card));
      if (result.mergedIntoExisting) {
        merged += 1;
      } else {
        accepted += 1;
      }
    } catch (error) {
      failed += 1;
      errors.push(
        `${card.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  return { accepted, merged, skipped, failed, errors };
};

export const acceptQueuedCard = async (
  input: CardInput,
): Promise<AcceptQueuedCardResult> => {
  const [existingByUrl] = await db
    .select({ id: cards.id })
    .from(cards)
    .where(eq(cards.url, input.url))
    .limit(1);

  if (existingByUrl && existingByUrl.id !== input.id) {
    const [existingCategoryRows, existingPlaylistRows] = await Promise.all([
      db
        .select()
        .from(cardCategories)
        .where(eq(cardCategories.cardId, existingByUrl.id)),
      db
        .select()
        .from(playlistCards)
        .where(eq(playlistCards.cardId, existingByUrl.id)),
    ]);

    const mergedCategories = [
      ...new Set([
        ...existingCategoryRows.map((row) => row.categorySlug),
        ...input.categories,
      ]),
    ];
    const mergedPlaylistIds = [
      ...new Set([
        ...existingPlaylistRows.map((row) => row.playlistId),
        ...input.playlistIds,
      ]),
    ];

    const mergedCategoryPositions = {
      ...Object.fromEntries(
        existingCategoryRows.map((row) => [row.categorySlug, row.position]),
      ),
      ...input.categoryPositions,
    };
    const mergedPlaylistPositions = {
      ...Object.fromEntries(
        existingPlaylistRows.map((row) => [row.playlistId, row.position]),
      ),
      ...input.playlistPositions,
    };

    await upsertCard({
      ...input,
      id: existingByUrl.id,
      categories: mergedCategories,
      playlistIds: mergedPlaylistIds,
      categoryPositions: mergedCategoryPositions,
      playlistPositions: mergedPlaylistPositions,
    });
    await deleteQueuedCard(input.id);
    return { targetId: existingByUrl.id, mergedIntoExisting: true };
  }

  await upsertCard(input);
  await deleteQueuedCard(input.id);
  return { targetId: input.id, mergedIntoExisting: false };
};
