import {
  reorderCard,
  setCategoryCardOrder,
  setPlaylistCardOrder,
} from "@src/utils/db/ordering";
import { jsonError } from "@src/utils/api";
import { categorySlugEnum } from "@src/utils/schema";
import { z } from "zod";

const categorySlug = z.enum(categorySlugEnum.enumValues);

const stepSchema = z.object({
  cardId: z.string().trim().min(1),
  direction: z.enum(["up", "down"]),
  context: z.discriminatedUnion("type", [
    z.object({ type: z.literal("category"), category: categorySlug }),
    z.object({ type: z.literal("playlist"), playlistId: z.string().trim().min(1) }),
  ]),
});

const batchSchema = z.object({
  order: z.array(z.string().trim().min(1)).min(1),
  context: z.discriminatedUnion("type", [
    z.object({ type: z.literal("category"), category: categorySlug }),
    z.object({ type: z.literal("playlist"), playlistId: z.string().trim().min(1) }),
  ]),
});

const bodySchema = z.union([stepSchema, batchSchema]);

export const POST = async (request: Request) => {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("Invalid reorder payload.");
    }

    if ("order" in parsed.data) {
      const { order, context } = parsed.data;
      const result =
        context.type === "category"
          ? await setCategoryCardOrder(context.category, order)
          : await setPlaylistCardOrder(context.playlistId, order);
      if ("error" in result) {
        return jsonError(result.error);
      }
      return Response.json({ ok: true });
    }

    const result = await reorderCard(
      parsed.data.cardId,
      parsed.data.context,
      parsed.data.direction,
    );
    if ("error" in result) {
      return jsonError(result.error);
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonError("Failed to reorder card.", 500);
  }
};
