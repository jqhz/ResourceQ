import { z } from "zod";
import { categorySlugEnum } from "./schema";

const categorySlug = z.enum(categorySlugEnum.enumValues);

export const cardInputSchema = z.object({
  id: z.string().trim().min(1),
  categories: z.array(categorySlug).min(1),
  playlistIds: z.array(z.string().trim()).optional(),
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  image: z.string().trim().optional(),
  date: z.string().trim().optional(),
  recommended: z.boolean().optional(),
  url: z.string().trim().min(1),
});

export const playlistInputSchema = z.object({
  id: z.string().trim().min(1),
  category: categorySlug,
  parentPlaylistId: z.string().trim().optional(),
  title: z.string().trim().min(1),
  image: z.string().trim().min(1),
  description: z.string().trim().optional(),
});

export const normalizePlaylistInput = (
  input: z.infer<typeof playlistInputSchema>,
) => ({
  ...input,
  parentPlaylistId: input.parentPlaylistId || undefined,
  description: input.description || undefined,
});

export const normalizeCardInput = (input: z.infer<typeof cardInputSchema>) => ({
  ...input,
  categories: [...new Set(input.categories)],
  playlistIds: [...new Set((input.playlistIds ?? []).filter(Boolean))],
  description: input.description || undefined,
  image: input.image || undefined,
  date: input.date || undefined,
  recommended: Boolean(input.recommended),
});
