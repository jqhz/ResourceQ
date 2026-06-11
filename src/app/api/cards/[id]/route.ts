import { deleteCard, upsertCard } from "@src/utils/db/cards";
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
    await upsertCard(normalizeCardInput(parsed.data));
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonError("Failed to update card.", 500);
  }
};

export const DELETE = async (_request: Request, context: RouteContext) => {
  const { id } = await context.params;
  try {
    await deleteCard(id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonError("Failed to delete card.", 500);
  }
};
