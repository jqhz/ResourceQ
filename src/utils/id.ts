import type { CategorySlug } from "./types";

const CATEGORY_PREFIX: Record<CategorySlug, string> = {
  tutorials: "tutorial",
  tech: "tech",
  documents: "document",
  downloads: "download",
  "apps-tools": "app",
  discords: "discord",
  youtube: "youtube",
  fanart: "fanart",
};

export const getCategoryPrefix = (category: CategorySlug) =>
  CATEGORY_PREFIX[category] ?? "card";

export const getPlaylistPrefix = (category: CategorySlug) =>
  `${getCategoryPrefix(category)}-p`;

export const orderCategoriesWithPrimary = (
  cardId: string,
  categories: CategorySlug[],
): CategorySlug[] => {
  if (categories.length <= 1) return categories;
  const primary = categories.find((slug) =>
    cardId.startsWith(`${getCategoryPrefix(slug)}-`),
  );
  if (!primary) return categories;
  return [primary, ...categories.filter((slug) => slug !== primary)];
};

const nextIdFromPrefix = (prefix: string, existingIds: string[]) => {
  const regex = new RegExp(`^${prefix}-(\\d{3})$`);
  const max = existingIds.reduce((acc, id) => {
    const match = id.match(regex);
    if (!match) return acc;
    const value = Number(match[1]);
    return Number.isNaN(value) ? acc : Math.max(acc, value);
  }, 0);
  const next = String(Math.min(max + 1, 999)).padStart(3, "0");
  return `${prefix}-${next}`;
};

export const getNextIdForCategory = (
  category: CategorySlug,
  existingIds: string[],
) => nextIdFromPrefix(getCategoryPrefix(category), existingIds);

export const getNextPlaylistId = (
  category: CategorySlug,
  existingIds: string[],
) => nextIdFromPrefix(getPlaylistPrefix(category), existingIds);
