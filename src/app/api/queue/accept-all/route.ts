import { acceptAllQueuedCards } from "@src/utils/db/queue";
import { jsonError } from "@src/utils/api";

export const POST = async () => {
  try {
    const result = await acceptAllQueuedCards();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error(error);
    return jsonError("Failed to accept queued cards.", 500);
  }
};
