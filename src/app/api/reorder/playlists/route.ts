import { reorderPlaylist } from "@src/utils/db/ordering";
import { jsonError } from "@src/utils/api";
import { z } from "zod";

const bodySchema = z.object({
  playlistId: z.string().trim().min(1),
  direction: z.enum(["up", "down"]),
});

export const POST = async (request: Request) => {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("Invalid reorder payload.");
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
