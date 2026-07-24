import {
  reorderPlaylist,
  setPlaylistSiblingOrder,
} from "@src/utils/db/ordering";
import { jsonError } from "@src/utils/api";
import { categorySlugEnum } from "@src/utils/schema";
import { z } from "zod";

const categorySlug = z.enum(categorySlugEnum.enumValues);

const stepSchema = z.object({
  playlistId: z.string().trim().min(1),
  direction: z.enum(["up", "down"]),
});

const batchSchema = z.object({
  category: categorySlug,
  parentPlaylistId: z.string().trim().min(1).optional(),
  order: z.array(z.string().trim().min(1)).min(1),
});

const bodySchema = z.union([stepSchema, batchSchema]);

export const POST = async (request: Request) => {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("Invalid reorder payload.");
    }

    if ("order" in parsed.data) {
      const result = await setPlaylistSiblingOrder(
        parsed.data.category,
        parsed.data.parentPlaylistId,
        parsed.data.order,
      );
      if ("error" in result) {
        return jsonError(result.error);
      }
      return Response.json({ ok: true });
    }

    const result = await reorderPlaylist(
      parsed.data.playlistId,
      parsed.data.direction,
    );
    if ("error" in result) {
      return jsonError(result.error);
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonError("Failed to reorder playlist.", 500);
  }
};
