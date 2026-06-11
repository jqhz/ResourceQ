import { acceptQueuedCard } from "@src/utils/db/queue";
import { jsonError } from "@src/utils/api";
import { cardInputSchema, normalizeCardInput } from "@src/utils/validation";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = async (request: Request, context: RouteContext) => {
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
    await acceptQueuedCard(normalizeCardInput(parsed.data));
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error && error.message.includes("unique")
        ? "A card with this URL already exists."
        : "Failed to accept queued card.";
    return jsonError(message, 500);
  }
};
