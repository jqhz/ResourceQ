import { and, asc, eq, isNull, max, sql } from "drizzle-orm";
import { db } from "./index";
import {
  cardCategories,
  playlistCards,
  playlists,
} from "../schema";
import type { CategorySlug, ReorderContext, CategoryTimelineEntry } from "../types";

export const nextPlaylistPosition = async (
  category: CategorySlug,
  parentPlaylistId?: string,
): Promise<number> => {
  const conditions = [eq(playlists.categorySlug, category)];
  if (parentPlaylistId) {
    conditions.push(eq(playlists.parentPlaylistId, parentPlaylistId));
  } else {
    conditions.push(isNull(playlists.parentPlaylistId));
  }
  const [row] = await db
    .select({ value: max(playlists.position) })
    .from(playlists)
    .where(and(...conditions));
  return (row?.value ?? -1) + 1;
};

export const nextCategoryCardPosition = async (
  category: CategorySlug,
): Promise<number> => {
  const [row] = await db
    .select({ value: max(cardCategories.position) })
    .from(cardCategories)
    .where(eq(cardCategories.categorySlug, category));
  return (row?.value ?? -1) + 1;
};

export const nextPlaylistCardPosition = async (
  playlistId: string,
): Promise<number> => {
  const [row] = await db
    .select({ value: max(playlistCards.position) })
    .from(playlistCards)
    .where(eq(playlistCards.playlistId, playlistId));
  return (row?.value ?? -1) + 1;
};

const renumberPlaylistPositions = async (
  orderedIds: string[],
) => {
  for (let index = 0; index < orderedIds.length; index += 1) {
    await db
      .update(playlists)
      .set({ position: index })
      .where(eq(playlists.id, orderedIds[index]));
  }
};

export const reorderPlaylist = async (
  playlistId: string,
  direction: "up" | "down",
): Promise<{ ok: true } | { error: string }> => {
  const [playlist] = await db
    .select()
    .from(playlists)
    .where(eq(playlists.id, playlistId))
    .limit(1);
  if (!playlist) {
    return { error: "Playlist not found." };
  }

  const siblingConditions = [eq(playlists.categorySlug, playlist.categorySlug)];
  if (playlist.parentPlaylistId) {
    siblingConditions.push(eq(playlists.parentPlaylistId, playlist.parentPlaylistId));
  } else {
    siblingConditions.push(isNull(playlists.parentPlaylistId));
  }

  const siblings = await db
    .select({ id: playlists.id })
    .from(playlists)
    .where(and(...siblingConditions))
    .orderBy(asc(playlists.position), asc(playlists.id));

  const index = siblings.findIndex((row) => row.id === playlistId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= siblings.length) {
    return { ok: true };
  }

  const orderedIds = siblings.map((row) => row.id);
  [orderedIds[index], orderedIds[swapIndex]] = [
    orderedIds[swapIndex],
    orderedIds[index],
  ];
  await renumberPlaylistPositions(orderedIds);
  return { ok: true };
};

const renumberCategoryCardPositions = async (
  category: CategorySlug,
  orderedCardIds: string[],
) => {
  for (let index = 0; index < orderedCardIds.length; index += 1) {
    await db
      .update(cardCategories)
      .set({ position: index })
      .where(
        and(
          eq(cardCategories.categorySlug, category),
          eq(cardCategories.cardId, orderedCardIds[index]),
        ),
      );
  }
};

type CategoryTimelineItem =
  | { kind: "card"; id: string; position: number }
  | { kind: "playlist"; id: string; position: number };

const getCategoryTimeline = async (
  category: CategorySlug,
): Promise<CategoryTimelineItem[]> => {
  const [cardRows, playlistRows] = await Promise.all([
    db
      .select({
        id: cardCategories.cardId,
        position: cardCategories.position,
      })
      .from(cardCategories)
      .where(eq(cardCategories.categorySlug, category)),
    db
      .select({
        id: playlists.id,
        position: playlists.position,
      })
      .from(playlists)
      .where(
        and(
          eq(playlists.categorySlug, category),
          isNull(playlists.parentPlaylistId),
        ),
      ),
  ]);

  const entries: CategoryTimelineItem[] = [
    ...cardRows.map((row) => ({
      kind: "card" as const,
      id: row.id,
      position: row.position,
    })),
    ...playlistRows.map((row) => ({
      kind: "playlist" as const,
      id: row.id,
      position: row.position,
    })),
  ];

  entries.sort(
    (left, right) =>
      left.position - right.position || left.id.localeCompare(right.id),
  );
  return entries;
};

const renumberCategoryTimeline = async (
  category: CategorySlug,
  timeline: CategoryTimelineItem[],
) => {
  for (let index = 0; index < timeline.length; index += 1) {
    const entry = timeline[index];
    if (entry.kind === "card") {
      await db
        .update(cardCategories)
        .set({ position: index })
        .where(
          and(
            eq(cardCategories.categorySlug, category),
            eq(cardCategories.cardId, entry.id),
          ),
        );
    } else {
      await db
        .update(playlists)
        .set({ position: index })
        .where(eq(playlists.id, entry.id));
    }
  }
};

export const setCategoryTimelineOrder = async (
  category: CategorySlug,
  order: CategoryTimelineEntry[],
): Promise<{ ok: true } | { error: string }> => {
  const timeline: CategoryTimelineItem[] = order.map((entry, index) => ({
    ...entry,
    position: index,
  }));
  await renumberCategoryTimeline(category, timeline);
  return { ok: true };
};

const reorderCategoryRootCard = async (
  cardId: string,
  category: CategorySlug,
  direction: "up" | "down",
): Promise<{ ok: true } | { error: string }> => {
  const timeline = await getCategoryTimeline(category);
  const index = timeline.findIndex(
    (entry) => entry.kind === "card" && entry.id === cardId,
  );
  if (index < 0) {
    return { error: "Card not found in category." };
  }

  if (direction === "up") {
    let targetIndex = -1;
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      if (timeline[cursor].kind === "card") {
        targetIndex = cursor;
        break;
      }
    }

    const [entry] = timeline.splice(index, 1);
    if (targetIndex < 0) {
      timeline.unshift(entry);
    } else {
      timeline.splice(targetIndex, 0, entry);
    }
  } else {
    let targetCardId: string | null = null;
    for (let cursor = index + 1; cursor < timeline.length; cursor += 1) {
      if (timeline[cursor].kind === "card") {
        targetCardId = timeline[cursor].id;
        break;
      }
    }

    const [entry] = timeline.splice(index, 1);
    if (!targetCardId) {
      timeline.push(entry);
    } else {
      const insertIndex = timeline.findIndex(
        (item) => item.kind === "card" && item.id === targetCardId,
      );
      timeline.splice(insertIndex + 1, 0, entry);
    }
  }

  await renumberCategoryTimeline(category, timeline);
  return { ok: true };
};

const renumberPlaylistCardPositions = async (
  playlistId: string,
  orderedCardIds: string[],
) => {
  for (let index = 0; index < orderedCardIds.length; index += 1) {
    await db
      .update(playlistCards)
      .set({ position: index })
      .where(
        and(
          eq(playlistCards.playlistId, playlistId),
          eq(playlistCards.cardId, orderedCardIds[index]),
        ),
      );
  }
};

export const reorderCard = async (
  cardId: string,
  context: ReorderContext,
  direction: "up" | "down",
): Promise<{ ok: true } | { error: string }> => {
  if (context.type === "category") {
    return reorderCategoryRootCard(cardId, context.category, direction);
  }

  const rows = await db
    .select({ cardId: playlistCards.cardId })
    .from(playlistCards)
    .where(eq(playlistCards.playlistId, context.playlistId))
    .orderBy(asc(playlistCards.position), asc(playlistCards.cardId));

  const orderedIds = rows.map((row) => row.cardId);
  const index = orderedIds.indexOf(cardId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= orderedIds.length) {
    return { ok: true };
  }
  [orderedIds[index], orderedIds[swapIndex]] = [
    orderedIds[swapIndex],
    orderedIds[index],
  ];
  await renumberPlaylistCardPositions(context.playlistId, orderedIds);
  return { ok: true };
};

export const backfillPositions = async () => {
  const playlistRows = await db
    .select({
      id: playlists.id,
      categorySlug: playlists.categorySlug,
      parentPlaylistId: playlists.parentPlaylistId,
    })
    .from(playlists)
    .orderBy(
      asc(playlists.categorySlug),
      sql`coalesce(${playlists.parentPlaylistId}, '')`,
      asc(playlists.id),
    );

  const playlistGroups = new Map<string, string[]>();
  for (const row of playlistRows) {
    const key = `${row.categorySlug}::${row.parentPlaylistId ?? ""}`;
    const group = playlistGroups.get(key) ?? [];
    group.push(row.id);
    playlistGroups.set(key, group);
  }
  for (const ids of playlistGroups.values()) {
    await renumberPlaylistPositions(ids);
  }

  const categoryRows = await db
    .select({
      cardId: cardCategories.cardId,
      categorySlug: cardCategories.categorySlug,
    })
    .from(cardCategories)
    .orderBy(asc(cardCategories.categorySlug), asc(cardCategories.cardId));

  const categoryGroups = new Map<string, string[]>();
  for (const row of categoryRows) {
    const group = categoryGroups.get(row.categorySlug) ?? [];
    group.push(row.cardId);
    categoryGroups.set(row.categorySlug, group);
  }
  for (const [category, ids] of categoryGroups.entries()) {
    await renumberCategoryCardPositions(category as CategorySlug, ids);
  }

  const playlistCardRows = await db
    .select({
      cardId: playlistCards.cardId,
      playlistId: playlistCards.playlistId,
    })
    .from(playlistCards)
    .orderBy(asc(playlistCards.playlistId), asc(playlistCards.cardId));

  const playlistCardGroups = new Map<string, string[]>();
  for (const row of playlistCardRows) {
    const group = playlistCardGroups.get(row.playlistId) ?? [];
    group.push(row.cardId);
    playlistCardGroups.set(row.playlistId, group);
  }
  for (const [playlistId, ids] of playlistCardGroups.entries()) {
    await renumberPlaylistCardPositions(playlistId, ids);
  }
};
