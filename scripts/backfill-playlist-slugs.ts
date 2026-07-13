import {
  listAllPlaylistsForBackfill,
  updatePlaylistSlug,
} from "../src/utils/db/playlists";
import { slugify } from "../src/utils/slug";

const uniqueSlugInCategory = (
  category: string,
  baseSlug: string,
  takenByCategory: Map<string, Set<string>>,
): string => {
  const normalizedBase = baseSlug || "playlist";
  const taken = takenByCategory.get(category) ?? new Set<string>();
  if (!taken.has(normalizedBase)) {
    taken.add(normalizedBase);
    takenByCategory.set(category, taken);
    return normalizedBase;
  }
  let suffix = 2;
  while (taken.has(`${normalizedBase}-${suffix}`)) {
    suffix += 1;
  }
  const slug = `${normalizedBase}-${suffix}`;
  taken.add(slug);
  takenByCategory.set(category, taken);
  return slug;
};

const main = async () => {
  const rows = await listAllPlaylistsForBackfill();
  const sorted = [...rows].sort((a, b) => a.id.localeCompare(b.id));
  const takenByCategory = new Map<string, Set<string>>();

  console.log(`Backfilling slugs for ${sorted.length} playlist(s)...`);

  for (const playlist of sorted) {
    const baseSlug = slugify(playlist.title);
    const slug = uniqueSlugInCategory(
      playlist.category,
      baseSlug,
      takenByCategory,
    );
    await updatePlaylistSlug(playlist.id, slug);
    console.log(`  ${playlist.id} (${playlist.category}) -> ${slug}`);
  }

  console.log("Backfill complete.");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
