import { reorderCard } from "@src/utils/db/ordering";
import { jsonError } from "@src/utils/api";
import { categorySlugEnum } from "@src/utils/schema";
import { z } from "zod";

const categorySlug = z.enum(categorySlugEnum.enumValues);

const bodySchema = z.object({
  cardId: z.string().trim().min(1),
  direction: z.enum(["up", "down"]),
  context: z.discriminatedUnion("type", [
    z.object({ type: z.literal("category"), category: categorySlug }),
    z.object({ type: z.literal("playlist"), playlistId: z.string().trim().min(1) }),
  ]),
});

export const POST = async (request: Request) => {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("Invalid reorder payload.");
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
