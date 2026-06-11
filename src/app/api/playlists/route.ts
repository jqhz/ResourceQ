import { listPlaylists } from "@src/utils/db/cards";
import { getAllPlaylistIds, upsertPlaylist } from "@src/utils/db/playlists";
import { jsonError } from "@src/utils/api";
import {
  normalizePlaylistInput,
  playlistInputSchema,
} from "@src/utils/validation";

export const GET = async () => {
  try {
    const playlists = await listPlaylists();
    return Response.json({ playlists });
  } catch (error) {
    console.error(error);
    return jsonError("Failed to load playlists.", 500);
  }
};

export const POST = async (request: Request) => {
  try {
    const body = (await request.json()) as { playlist?: unknown };
    const parsed = playlistInputSchema.safeParse(body.playlist);
    if (!parsed.success) {
      return jsonError("Invalid playlist payload.");
    }
    const input = normalizePlaylistInput(parsed.data);
    const existingIds = await getAllPlaylistIds();
    if (existingIds.includes(input.id)) {
      return jsonError("Playlist id already exists.");
    }
    await upsertPlaylist(input);
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonError("Failed to create playlist.", 500);
  }
};
