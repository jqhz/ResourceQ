import type { CategorySlug } from "./types";

export const reorderList = <T>(items: T[], fromIndex: number, toIndex: number): T[] => {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }

  const nextItems = [...items];
  const [moved] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, moved);
  return nextItems;
};

export const playlistSiblingGroupKey = (
  category: CategorySlug,
  parentPlaylistId?: string,
) => `${category}::${parentPlaylistId ?? ""}`;
