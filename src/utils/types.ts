import { categorySlugEnum } from "./schema";

export type CategorySlug = (typeof categorySlugEnum.enumValues)[number];

export type CategoryPositions = Partial<Record<CategorySlug, number>>;

export interface Playlist {
  id: string;
  category: CategorySlug;
  parentPlaylistId?: string;
  title: string;
  slug: string;
  position: number;
  image: string;
  description?: string;
}

export interface CardItem {
  id: string;
  categories: CategorySlug[];
  playlistIds: string[];
  categoryPositions: CategoryPositions;
  playlistPositions: Record<string, number>;
  title: string;
  description?: string;
  image?: string;
  date?: string;
  recommended?: boolean;
  archived: boolean;
  url: string;
}

export interface CardInput {
  id: string;
  categories: CategorySlug[];
  playlistIds: string[];
  categoryPositions?: CategoryPositions;
  playlistPositions?: Record<string, number>;
  title: string;
  description?: string;
  image?: string;
  date?: string;
  recommended?: boolean;
  archived?: boolean;
  url: string;
}

export type ReorderContext =
  | { type: "category"; category: CategorySlug }
  | { type: "playlist"; playlistId: string };

export type CategoryTimelineEntry =
  | { kind: "card"; id: string }
  | { kind: "playlist"; id: string };

export type CategoryTimelineRow =
  | { kind: "card"; id: string; position: number; card: CardItem }
  | { kind: "playlist"; id: string; position: number; playlist: Playlist };
