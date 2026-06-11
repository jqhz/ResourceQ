import { eq } from "drizzle-orm";
import { db } from "./index";
import { playlists } from "../schema";
import type { CategorySlug, Playlist } from "../types";

export interface PlaylistInput {
  id: string;
  category: CategorySlug;
  parentPlaylistId?: string;
  title: string;
  image: string;
  description?: string;
}

export const getAllPlaylistIds = async (): Promise<string[]> => {
  const rows = await db.select({ id: playlists.id }).from(playlists);
  return rows.map((row) => row.id);
};

export const upsertPlaylist = async (input: PlaylistInput) => {
  await db
    .insert(playlists)
    .values({
      id: input.id,
      categorySlug: input.category,
      parentPlaylistId: input.parentPlaylistId,
      title: input.title,
      image: input.image,
      description: input.description,
    })
    .onConflictDoUpdate({
      target: playlists.id,
      set: {
        categorySlug: input.category,
        parentPlaylistId: input.parentPlaylistId,
        title: input.title,
        image: input.image,
        description: input.description,
      },
    });
};

export const deletePlaylist = async (id: string) => {
  await db.delete(playlists).where(eq(playlists.id, id));
};
