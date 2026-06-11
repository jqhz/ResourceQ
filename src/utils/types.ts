import { categorySlugEnum } from "./schema";

export type CategorySlug = (typeof categorySlugEnum.enumValues)[number];

export interface Playlist {
  id: string;
  category: CategorySlug;
  parentPlaylistId?: string;
  title: string;
  image: string;
  description?: string;
}

export interface CardItem {
  id: string;
  categories: CategorySlug[];
  playlistIds: string[];
  title: string;
  description?: string;
  image?: string;
  date?: string;
  recommended?: boolean;
  url: string;
}

export interface CardInput {
  id: string;
  categories: CategorySlug[];
  playlistIds: string[];
  title: string;
  description?: string;
  image?: string;
  date?: string;
  recommended?: boolean;
  url: string;
}
