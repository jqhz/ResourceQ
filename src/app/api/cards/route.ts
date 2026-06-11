import { listCards, listPlaylists } from "@src/utils/db/cards";
import { jsonError } from "@src/utils/api";

export const GET = async () => {
  try {
    const [cards, playlists] = await Promise.all([listCards(), listPlaylists()]);
    return Response.json({ cards, playlists });
  } catch (error) {
    console.error(error);
    return jsonError("Failed to load cards.", 500);
  }
};
