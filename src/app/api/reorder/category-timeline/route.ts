import { setCategoryTimelineOrder } from "@src/utils/db/ordering";
import { jsonError } from "@src/utils/api";
import { categorySlugEnum } from "@src/utils/schema";
import { z } from "zod";

const categorySlug = z.enum(categorySlugEnum.enumValues);

const bodySchema = z.object({
  category: categorySlug,
  order: z.array(
    z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("card"), id: z.string().trim().min(1) }),
      z.object({ kind: z.literal("playlist"), id: z.string().trim().min(1) }),
    ]),
  ),
});

export const POST = async (request: Request) => {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("Invalid category timeline payload.");
    }
    const result = await setCategoryTimelineOrder(
      parsed.data.category,
      parsed.data.order,
    );
    if ("error" in result) {
      return jsonError(result.error);
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonError("Failed to reorder category timeline.", 500);
  }
};
