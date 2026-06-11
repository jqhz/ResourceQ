import Fuse from "fuse.js";
import type { CardItem } from "./types";
import { CATEGORIES } from "./constants";

const categoryLabelMap = new Map(
  CATEGORIES.map((category) => [category.slug, category.label]),
);

export type SearchableCard = CardItem & {
  categoryText: string;
};

const toSearchable = (card: CardItem): SearchableCard => ({
  ...card,
  categoryText: card.categories
    .map((slug) => categoryLabelMap.get(slug) ?? slug)
    .join(" "),
});

export const createCardSearch = (cards: CardItem[]) =>
  new Fuse(cards.map(toSearchable), {
    keys: ["title", "id", "description", "url", "categoryText"],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

export const searchCards = (cards: CardItem[], query: string) => {
  const trimmed = query.trim();
  if (!trimmed) return cards;
  return createCardSearch(cards)
    .search(trimmed)
    .map((result) => result.item);
};
