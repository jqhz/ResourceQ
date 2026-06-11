import {
  createQueuedCard,
  getAllQueuedCardIds,
  listQueuedCards,
} from "@src/utils/db/queue";
import { getAllCardIds } from "@src/utils/db/cards";
import { jsonError } from "@src/utils/api";
import { cardInputSchema, normalizeCardInput } from "@src/utils/validation";

export const GET = async () => {
  try {
    const cards = await listQueuedCards();
    return Response.json({ cards });
  } catch (error) {
    console.error(error);
    return jsonError("Failed to load queue.", 500);
  }
};

export const POST = async (request: Request) => {
  try {
    const body = (await request.json()) as { card?: unknown };
    const parsed = cardInputSchema.safeParse(body.card);
    if (!parsed.success) {
      return jsonError("Invalid card payload.");
    }
    const input = normalizeCardInput(parsed.data);
    const [cardIds, queuedIds] = await Promise.all([
      getAllCardIds(),
      getAllQueuedCardIds(),
    ]);
    if (cardIds.includes(input.id) || queuedIds.includes(input.id)) {
      return jsonError("Card id already exists.");
    }
    await createQueuedCard(input);
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonError("Failed to queue card.", 500);
  }
};
