import { deleteQueuedCard, updateQueuedCard } from "@src/utils/db/queue";
import { jsonError } from "@src/utils/api";
import { cardInputSchema, normalizeCardInput } from "@src/utils/validation";

type RouteContext = { params: Promise<{ id: string }> };

export const PUT = async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  try {
    const body = (await request.json()) as { card?: unknown };
    const parsed = cardInputSchema.safeParse(body.card);
    if (!parsed.success) {
      return jsonError("Invalid card payload.");
    }
    if (parsed.data.id !== id) {
      return jsonError("Card id mismatch.");
    }
    await updateQueuedCard(normalizeCardInput(parsed.data));
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonError("Failed to update queued card.", 500);
  }
};

export const DELETE = async (_request: Request, context: RouteContext) => {
  const { id } = await context.params;
  try {
    await deleteQueuedCard(id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonError("Failed to reject queued card.", 500);
  }
};
