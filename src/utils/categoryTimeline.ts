import type {
  CardItem,
  CategorySlug,
  CategoryTimelineEntry,
  CategoryTimelineRow,
  Playlist,
} from "./types";

export const buildCategoryTimelineRows = (
  category: CategorySlug,
  cards: CardItem[],
  playlists: Playlist[],
): CategoryTimelineRow[] => {
  const rows: CategoryTimelineRow[] = [
    ...cards
      .filter((card) => card.categories.includes(category))
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
