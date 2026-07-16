import { setCardArchived } from "@src/utils/db/cards";
import { jsonError } from "@src/utils/api";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  archived: z.boolean(),
});

export const PATCH = async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("Invalid archive payload.");
    }
    await setCardArchived(id, parsed.data.archived);
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonError("Failed to update archive status.", 500);
  }
};
