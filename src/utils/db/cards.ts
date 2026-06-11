import { eq, inArray } from "drizzle-orm";
import { db } from "./index";
import {
  cards,
  cardCategories,
  playlistCards,
  playlists,
} from "../schema";
import type { CardInput, CardItem, CategorySlug, Playlist } from "../types";
import { orderCategoriesWithPrimary } from "../id";

const toCardItem = (
  row: typeof cards.$inferSelect,
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

export const listCards = async (): Promise<CardItem[]> => {
  const cardRows = await db.select().from(cards);
  if (cardRows.length === 0) return [];

  const cardIds = cardRows.map((row) => row.id);
  const [categoryRows, playlistRows] = await Promise.all([
    db
      .select()
      .from(cardCategories)
      .where(inArray(cardCategories.cardId, cardIds)),
    db
      .select()
      .from(playlistCards)
      .where(inArray(playlistCards.cardId, cardIds)),
  ]);

  const categoriesByCard = new Map<string, CategorySlug[]>();
  for (const row of categoryRows) {
    const list = categoriesByCard.get(row.cardId) ?? [];
    list.push(row.categorySlug);
    categoriesByCard.set(row.cardId, list);
  }

  const playlistsByCard = new Map<string, string[]>();
  for (const row of playlistRows) {
    const list = playlistsByCard.get(row.cardId) ?? [];
    list.push(row.playlistId);
    playlistsByCard.set(row.cardId, list);
  }

  return cardRows.map((row) =>
    toCardItem(
      row,
      orderCategoriesWithPrimary(
        row.id,
        categoriesByCard.get(row.id) ?? [],
      ),
      playlistsByCard.get(row.id) ?? [],
    ),
  );
};

export const listPlaylists = async (): Promise<Playlist[]> => {
  const rows = await db.select().from(playlists);
  return rows.map((row) => ({
    id: row.id,
    category: row.categorySlug,
    parentPlaylistId: row.parentPlaylistId ?? undefined,
    title: row.title,
    image: row.image,
    description: row.description ?? undefined,
  }));
};

export const getAllCardIds = async (): Promise<string[]> => {
  const rows = await db.select({ id: cards.id }).from(cards);
  return rows.map((row) => row.id);
};

export const upsertCard = async (input: CardInput) => {
  await db
    .insert(cards)
    .values({
      id: input.id,
      title: input.title,
      description: input.description,
      image: input.image,
      date: input.date,
      recommended: input.recommended ?? false,
      url: input.url,
    })
    .onConflictDoUpdate({
      target: cards.id,
      set: {
        title: input.title,
        description: input.description,
        image: input.image,
        date: input.date,
        recommended: input.recommended ?? false,
        url: input.url,
      },
    });

  await db.delete(cardCategories).where(eq(cardCategories.cardId, input.id));
  if (input.categories.length > 0) {
    await db.insert(cardCategories).values(
      input.categories.map((categorySlug) => ({
        cardId: input.id,
        categorySlug,
      })),
    );
  }

  await db.delete(playlistCards).where(eq(playlistCards.cardId, input.id));
  if (input.playlistIds.length > 0) {
    await db.insert(playlistCards).values(
      input.playlistIds.map((playlistId) => ({
        cardId: input.id,
        playlistId,
      })),
    );
  }
};

export const deleteCard = async (id: string) => {
  await db.delete(cards).where(eq(cards.id, id));
};
