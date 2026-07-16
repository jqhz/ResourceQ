import { and, eq, ne } from "drizzle-orm";
import { db } from "./index";
import { playlists } from "../schema";
import type { CategorySlug, Playlist } from "../types";
import { slugify } from "../slug";
import { nextPlaylistPosition } from "./ordering";

export interface PlaylistInput {
  id: string;
  category: CategorySlug;
  parentPlaylistId?: string;
  title: string;
  slug: string;
  position?: number;
  image: string;
  description?: string;
}

export const getAllPlaylistIds = async (): Promise<string[]> => {
  const rows = await db.select({ id: playlists.id }).from(playlists);
  return rows.map((row) => row.id);
};

export const getSlugsForCategory = async (
  category: CategorySlug,
  excludePlaylistId?: string,
): Promise<string[]> => {
  const conditions = [eq(playlists.categorySlug, category)];
  if (excludePlaylistId) {
    conditions.push(ne(playlists.id, excludePlaylistId));
  }
  const rows = await db
    .select({ slug: playlists.slug })
    .from(playlists)
    .where(and(...conditions));
  return rows.map((row) => row.slug);
};

export const isSlugTakenInCategory = async (
  category: CategorySlug,
  slug: string,
  excludePlaylistId?: string,
): Promise<boolean> => {
  const conditions = [
    eq(playlists.categorySlug, category),
    eq(playlists.slug, slug),
  ];
  if (excludePlaylistId) {
    conditions.push(ne(playlists.id, excludePlaylistId));
  }
  const rows = await db
    .select({ id: playlists.id })
    .from(playlists)
    .where(and(...conditions))
    .limit(1);
  return rows.length > 0;
};

export const uniqueSlugForCategory = async (
  category: CategorySlug,
  baseSlug: string,
  excludePlaylistId?: string,
): Promise<string> => {
  const normalizedBase = baseSlug || slugify("playlist");
  const taken = await getSlugsForCategory(category, excludePlaylistId);
  const takenSet = new Set(taken);
  if (!takenSet.has(normalizedBase)) {
    return normalizedBase;
  }
  let suffix = 2;
  while (takenSet.has(`${normalizedBase}-${suffix}`)) {
    suffix += 1;
  }
  return `${normalizedBase}-${suffix}`;
};

export const resolvePlaylistSlug = async (
  input: Pick<PlaylistInput, "category" | "title" | "id"> & { slug?: string },
  options: { isCreate: boolean },
): Promise<{ slug: string; error?: string }> => {
  if (options.isCreate) {
    const autoSlug = slugify(input.title);
    const provided = input.slug?.trim();
    const baseSlug = provided || autoSlug;
    if (!baseSlug) {
      return { slug: "", error: "Unable to generate slug from title." };
    }
    const isManualOverride = Boolean(provided && provided !== autoSlug);
    if (isManualOverride) {
      const taken = await isSlugTakenInCategory(input.category, provided!);
      if (taken) {
        return { slug: provided!, error: "Slug already exists in this category." };
      }
      return { slug: provided! };
    }
    return {
      slug: await uniqueSlugForCategory(input.category, baseSlug),
    };
  }

  const slug = input.slug?.trim();
  if (!slug) {
    return { slug: "", error: "Slug is required." };
  }
  const taken = await isSlugTakenInCategory(input.category, slug, input.id);
  if (taken) {
    return { slug, error: "Slug already exists in this category." };
  }
  return { slug };
};

export const upsertPlaylist = async (input: PlaylistInput) => {
  const [existing] = await db
    .select({ position: playlists.position })
    .from(playlists)
    .where(eq(playlists.id, input.id))
    .limit(1);

  const position =
    input.position ??
    existing?.position ??
    (await nextPlaylistPosition(input.category, input.parentPlaylistId));

  await db
    .insert(playlists)
    .values({
      id: input.id,
      categorySlug: input.category,
      parentPlaylistId: input.parentPlaylistId,
      title: input.title,
      slug: input.slug,
      position,
      image: input.image,
      description: input.description,
    })
    .onConflictDoUpdate({
      target: playlists.id,
      set: {
        categorySlug: input.category,
        parentPlaylistId: input.parentPlaylistId,
        title: input.title,
        slug: input.slug,
        position,
        image: input.image,
        description: input.description,
      },
    });
};

export const deletePlaylist = async (id: string) => {
  await db.delete(playlists).where(eq(playlists.id, id));
};

export const listAllPlaylistsForBackfill = async (): Promise<
  Pick<Playlist, "id" | "category" | "title">[]
> => {
  const rows = await db
    .select({
      id: playlists.id,
      category: playlists.categorySlug,
      title: playlists.title,
    })
    .from(playlists);
  return rows;
};

export const updatePlaylistSlug = async (id: string, slug: string) => {
  await db.update(playlists).set({ slug }).where(eq(playlists.id, id));
};
