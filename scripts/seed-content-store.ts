import { readFileSync } from "fs";
import { db } from "../src/utils/db/index";
import { categories, playlists, cards, cardCategories, playlistCards } from "../src/utils/schema";
import { CATEGORIES } from "../src/utils/constants";
import type { CategorySlug } from "../src/utils/types";

interface ContentStorePlaylist {
  id: string;
  category: CategorySlug;
  title: string;
  image: string;
  description?: string;
}

interface ContentStoreCard {
  id: string;
  category: CategorySlug;
  playlistId?: string;
  title: string;
  description?: string;
  image?: string;
  date?: string;
  recommended?: boolean;
  searchable?: boolean;
  url: string;
}

interface ContentStore {
  playlists: ContentStorePlaylist[];
  cards: ContentStoreCard[];
}

const loadStore = (filePath: string): ContentStore => {
  const raw = readFileSync(filePath, "utf8");
  const jsonStart = raw.indexOf("{");
  return JSON.parse(raw.slice(jsonStart)) as ContentStore;
};

const dedupeCardsByUrl = (cards: ContentStoreCard[]) => {
  const seen = new Set<string>();
  const unique: ContentStoreCard[] = [];
  const skipped: { id: string; url: string; keptId: string }[] = [];

  for (const card of cards) {
    const url = card.url.trim();
    if (seen.has(url)) {
      const kept = unique.find((c) => c.url.trim() === url);
      skipped.push({ id: card.id, url, keptId: kept?.id ?? "unknown" });
      continue;
    }
    seen.add(url);
    unique.push(card);
  }

  return { unique, skipped };
};

const main = async () => {
  const filePath =
    process.argv[2] ??
    "/home/jahzz/.cursor/projects/home-jahzz-Documents-Code-ResourceQ/uploads/content-store-0.json";

  const store = loadStore(filePath);
  const { unique: cardsToImport, skipped } = dedupeCardsByUrl(store.cards);

  console.log(`Source: ${filePath}`);
  console.log(`Playlists: ${store.playlists.length}`);
  console.log(`Cards in file: ${store.cards.length}`);
  console.log(`Cards to import (unique URLs): ${cardsToImport.length}`);
  console.log(`Skipped duplicate URLs: ${skipped.length}`);

  await db
    .insert(categories)
    .values(CATEGORIES.map((c) => ({ slug: c.slug, label: c.label })))
    .onConflictDoNothing();

  await db
    .insert(playlists)
    .values(
      store.playlists.map((p) => ({
        id: p.id,
        categorySlug: p.category,
        title: p.title,
        image: p.image,
        description: p.description,
      })),
    )
    .onConflictDoNothing();

  const playlistIds = new Set(store.playlists.map((p) => p.id));

  for (const card of cardsToImport) {
    await db
      .insert(cards)
      .values({
        id: card.id,
        title: card.title,
        description: card.description,
        image: card.image,
        date: card.date,
        recommended: Boolean(card.recommended),
        url: card.url.trim(),
      })
      .onConflictDoNothing();

    await db
      .insert(cardCategories)
      .values({ cardId: card.id, categorySlug: card.category })
      .onConflictDoNothing();

    if (card.playlistId && playlistIds.has(card.playlistId)) {
      await db
        .insert(playlistCards)
        .values({ cardId: card.id, playlistId: card.playlistId })
        .onConflictDoNothing();
    }
  }

  if (skipped.length > 0) {
    console.log("\nSkipped duplicates:");
    for (const entry of skipped) {
      console.log(`  ${entry.id} (${entry.url}) — kept ${entry.keptId}`);
    }
  }

  console.log("\nSeed complete.");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
