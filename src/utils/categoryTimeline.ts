import type {
  CardItem,
  CategorySlug,
  CategoryTimelineEntry,
  CategoryTimelineRow,
  Playlist,
} from "./types";

export const categoryPlaylistIds = (
  playlists: Playlist[],
  category: CategorySlug,
) =>
  new Set(
    playlists.filter((playlist) => playlist.category === category).map((playlist) => playlist.id),
  );

/** In-category card that is not placed in any playlist belonging to this category. */
export const isCategoryRootCard = (
  card: Pick<CardItem, "categories" | "playlistIds">,
  category: CategorySlug,
  playlists: Playlist[],
): boolean => {
  if (!card.categories.includes(category)) {
    return false;
  }
  const playlistIdsInCategory = categoryPlaylistIds(playlists, category);
  return !card.playlistIds.some((playlistId) => playlistIdsInCategory.has(playlistId));
};

export const buildCategoryTimelineRows = (
  category: CategorySlug,
  cards: CardItem[],
  playlists: Playlist[],
): CategoryTimelineRow[] => {
  const rows: CategoryTimelineRow[] = [
    ...cards
      .filter((card) => isCategoryRootCard(card, category, playlists))
      .map((card) => ({
        kind: "card" as const,
        id: card.id,
        position: card.categoryPositions[category] ?? 0,
        card,
      })),
    ...playlists
      .filter(
        (playlist) =>
          playlist.category === category && !playlist.parentPlaylistId,
      )
      .map((playlist) => ({
        kind: "playlist" as const,
        id: playlist.id,
        position: playlist.position,
        playlist,
      })),
  ];

  rows.sort(
    (left, right) =>
      left.position - right.position || left.id.localeCompare(right.id),
  );
  return rows;
};

export const toCategoryTimelineEntries = (
  rows: CategoryTimelineRow[],
): CategoryTimelineEntry[] => rows.map(({ kind, id }) => ({ kind, id }));

export const reorderTimelineRows = (
  rows: CategoryTimelineRow[],
  fromIndex: number,
  toIndex: number,
): CategoryTimelineRow[] => {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= rows.length ||
    toIndex >= rows.length ||
    fromIndex === toIndex
  ) {
    return rows;
  }

  const nextRows = [...rows];
  const [moved] = nextRows.splice(fromIndex, 1);
  nextRows.splice(toIndex, 0, moved);
  return nextRows;
};
