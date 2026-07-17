import { asc, eq } from "drizzle-orm";
import { db } from "./index";
import {
  cards,
  cardCategories,
  playlistCards,
  playlists,
} from "../schema";
import type {
  CardInput,
  CardItem,
  CategoryPositions,
  CategorySlug,
  Playlist,
} from "../types";
import { orderCategoriesWithPrimary } from "../id";
import {
  nextCategoryCardPosition,
  nextPlaylistCardPosition,
} from "./ordering";

const toCardItem = (
  row: typeof cards.$inferSelect,
  categories: CategorySlug[],
  categoryPositions: CategoryPositions,
  playlistIds: string[],
  playlistPositions: Record<string, number>,
): CardItem => ({
  id: row.id,
  categories,
  playlistIds,
  categoryPositions,
  playlistPositions,
  title: row.title,
  description: row.description ?? undefined,
  image: row.image ?? undefined,
  date: row.date ?? undefined,
  recommended: row.recommended,
  archived: row.archived,
  url: row.url,
});

export const listCards = async (): Promise<CardItem[]> => {
  const [cardRows, categoryRows, playlistRows] = await Promise.all([
    db.select().from(cards),
    db
      .select()
      .from(cardCategories)
      .orderBy(asc(cardCategories.position)),
    db
      .select()
      .from(playlistCards)
      .orderBy(asc(playlistCards.position)),
  ]);

  if (cardRows.length === 0) return [];

  const categoriesByCard = new Map<string, CategorySlug[]>();
  const categoryPositionsByCard = new Map<string, CategoryPositions>();
  for (const row of categoryRows) {
    const list = categoriesByCard.get(row.cardId) ?? [];
    list.push(row.categorySlug);
    categoriesByCard.set(row.cardId, list);

    const positions = categoryPositionsByCard.get(row.cardId) ?? {};
    positions[row.categorySlug] = row.position;
    categoryPositionsByCard.set(row.cardId, positions);
  }

  const playlistsByCard = new Map<string, string[]>();
  const playlistPositionsByCard = new Map<string, Record<string, number>>();
  for (const row of playlistRows) {
    const list = playlistsByCard.get(row.cardId) ?? [];
    list.push(row.playlistId);
    playlistsByCard.set(row.cardId, list);

    const positions = playlistPositionsByCard.get(row.cardId) ?? {};
    positions[row.playlistId] = row.position;
    playlistPositionsByCard.set(row.cardId, positions);
  }

  return cardRows.map((row) =>
    toCardItem(
      row,
      orderCategoriesWithPrimary(
        row.id,
        categoriesByCard.get(row.id) ?? [],
      ),
      categoryPositionsByCard.get(row.id) ?? {},
      playlistsByCard.get(row.id) ?? [],
      playlistPositionsByCard.get(row.id) ?? {},
    ),
  );
};

export const listPlaylists = async (): Promise<Playlist[]> => {
  const rows = await db
    .select()
    .from(playlists)
    .orderBy(
      asc(playlists.categorySlug),
      asc(playlists.position),
      asc(playlists.id),
    );
  return rows.map((row) => ({
    id: row.id,
    category: row.categorySlug,
    parentPlaylistId: row.parentPlaylistId ?? undefined,
    title: row.title,
    slug: row.slug,
    position: row.position,
    image: row.image,
    description: row.description ?? undefined,
  }));
};

export const getAllCardIds = async (): Promise<string[]> => {
  const rows = await db.select({ id: cards.id }).from(cards);
  return rows.map((row) => row.id);
};

export const upsertCard = async (input: CardInput) => {
  const [existing] = await db
    .select({ archived: cards.archived })
    .from(cards)
    .where(eq(cards.id, input.id))
    .limit(1);

  await db
    .insert(cards)
    .values({
      id: input.id,
      title: input.title,
      description: input.description,
      image: input.image,
      date: input.date,
      recommended: input.recommended ?? false,
      archived: input.archived ?? existing?.archived ?? false,
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
        archived: input.archived ?? existing?.archived ?? false,
        url: input.url,
      },
    });

  const [existingCategoryRows, existingPlaylistRows] = await Promise.all([
    db
      .select()
      .from(cardCategories)
      .where(eq(cardCategories.cardId, input.id)),
    db
      .select()
      .from(playlistCards)
      .where(eq(playlistCards.cardId, input.id)),
  ]);

  const existingCategoryPositions = new Map(
    existingCategoryRows.map((row) => [row.categorySlug, row.position]),
  );
  const existingPlaylistPositions = new Map(
    existingPlaylistRows.map((row) => [row.playlistId, row.position]),
  );

  await db.delete(cardCategories).where(eq(cardCategories.cardId, input.id));
  if (input.categories.length > 0) {
    const categoryValues = await Promise.all(
      input.categories.map(async (categorySlug) => ({
        cardId: input.id,
        categorySlug,
        position:
          input.categoryPositions?.[categorySlug] ??
          existingCategoryPositions.get(categorySlug) ??
          (await nextCategoryCardPosition(categorySlug)),
      })),
    );
    await db.insert(cardCategories).values(categoryValues);
  }

  await db.delete(playlistCards).where(eq(playlistCards.cardId, input.id));
  if (input.playlistIds.length > 0) {
    const playlistValues = await Promise.all(
      input.playlistIds.map(async (playlistId) => ({
        cardId: input.id,
        playlistId,
        position:
          input.playlistPositions?.[playlistId] ??
          existingPlaylistPositions.get(playlistId) ??
          (await nextPlaylistCardPosition(playlistId)),
      })),
    );
    await db.insert(playlistCards).values(playlistValues);
  }
};

export const setCardArchived = async (id: string, archived: boolean) => {
  await db.update(cards).set({ archived }).where(eq(cards.id, id));
};

export const deleteCard = async (id: string) => {
  await db.delete(cards).where(eq(cards.id, id));
};
