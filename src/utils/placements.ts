import { CATEGORIES } from "./constants";
import type { CategorySlug, Playlist } from "./types";

export type PlacementKey = `category:${CategorySlug}` | `playlist:${string}`;

export interface PlacementOption {
  key: PlacementKey;
  label: string;
  depth: number;
  kind: "category" | "playlist";
}

export const buildPlacementOptions = (playlists: Playlist[]): PlacementOption[] => {
  const options: PlacementOption[] = [];

  for (const category of CATEGORIES) {
    options.push({
      key: `category:${category.slug}`,
      label: category.label,
      depth: 0,
      kind: "category",
    });

    const inCategory = playlists.filter(
      (playlist) => playlist.category === category.slug,
    );

    const appendPlaylist = (playlist: Playlist, depth: number) => {
      options.push({
        key: `playlist:${playlist.id}`,
        label: playlist.title,
        depth,
        kind: "playlist",
      });
      inCategory
        .filter((child) => child.parentPlaylistId === playlist.id)
        .forEach((child) => appendPlaylist(child, depth + 1));
    };

    inCategory
      .filter((playlist) => !playlist.parentPlaylistId)
      .forEach((playlist) => appendPlaylist(playlist, 1));
  }

  return options;
};

export const toPlacementKeys = (
  categories: CategorySlug[],
  playlistIds: string[],
): PlacementKey[] => [
  ...categories.map((slug) => `category:${slug}` as PlacementKey),
  ...playlistIds.map((id) => `playlist:${id}` as PlacementKey),
];

export const derivePrimaryCategory = (
  keys: PlacementKey[],
  playlists: Playlist[],
): CategorySlug => {
  for (const key of keys) {
    if (key.startsWith("category:")) {
      return key.slice("category:".length) as CategorySlug;
    }
  }
  for (const key of keys) {
    if (key.startsWith("playlist:")) {
      const playlist = playlists.find(
        (item) => item.id === key.slice("playlist:".length),
      );
      if (playlist) return playlist.category;
    }
  }
  return "tutorials";
};

export const fromPlacementKeys = (
  keys: PlacementKey[],
  playlists: Playlist[],
) => {
  const categories: CategorySlug[] = [];
  const playlistIds: string[] = [];

  for (const key of keys) {
    if (key.startsWith("category:")) {
      const slug = key.slice("category:".length) as CategorySlug;
      if (!categories.includes(slug)) categories.push(slug);
    } else if (key.startsWith("playlist:")) {
      const id = key.slice("playlist:".length);
      if (!playlistIds.includes(id)) playlistIds.push(id);
    }
  }

  const primaryCategory = derivePrimaryCategory(keys, playlists);
  const orderedCategories =
    categories.length > 0
      ? [
          primaryCategory,
          ...categories.filter((slug) => slug !== primaryCategory),
        ]
      : [];

  return {
    categories: orderedCategories,
    playlistIds,
    primaryCategory,
  };
};
