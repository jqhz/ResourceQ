import { deletePlaylist, upsertPlaylist } from "@src/utils/db/playlists";
import { jsonError } from "@src/utils/api";
import {
  normalizePlaylistInput,
  playlistInputSchema,
} from "@src/utils/validation";

type RouteContext = { params: Promise<{ id: string }> };

export const PUT = async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  try {
    const body = (await request.json()) as { playlist?: unknown };
    const parsed = playlistInputSchema.safeParse(body.playlist);
    if (!parsed.success) {
      return jsonError("Invalid playlist payload.");
    }
    if (parsed.data.id !== id) {
      return jsonError("Playlist id mismatch.");
    }
    await upsertPlaylist(normalizePlaylistInput(parsed.data));
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonError("Failed to update playlist.", 500);
  }
};

export const DELETE = async (_request: Request, context: RouteContext) => {
  const { id } = await context.params;
  try {
    await deletePlaylist(id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonError("Failed to delete playlist.", 500);
  }
};
