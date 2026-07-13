import { createHash } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";
import { sql } from "drizzle-orm";
import { db } from "../src/utils/db/index";
import { slugify } from "../src/utils/slug";

type Row = Record<string, unknown>;

const rowsOf = (result: { rows?: Row[] } | Row[]): Row[] =>
  Array.isArray(result) ? result : (result.rows ?? []);

const migrationHash = (file: string) =>
  createHash("sha256")
    .update(readFileSync(resolve(process.cwd(), file)).toString())
    .digest("hex");

const MIGRATIONS: { file: string; when: number }[] = [
  { file: "drizzle/20260713070313_cuddly_overlord.sql", when: 1783926193515 },
  {
    file: "drizzle/20260713070314_playlist_slug_constraints.sql",
    when: 1783926193516,
  },
];

const columnExists = async (column: string) => {
  const result = await db.execute(
    sql`SELECT 1 FROM information_schema.columns
        WHERE table_name = 'playlists' AND column_name = ${column}`,
  );
  return rowsOf(result).length > 0;
};

const uniqueSlugInCategory = (
  category: string,
  baseSlug: string,
  takenByCategory: Map<string, Set<string>>,
) => {
  const normalizedBase = baseSlug || "playlist";
  const taken = takenByCategory.get(category) ?? new Set<string>();
  let slug = normalizedBase;
  let suffix = 2;
  while (taken.has(slug)) {
    slug = `${normalizedBase}-${suffix}`;
    suffix += 1;
  }
  taken.add(slug);
  takenByCategory.set(category, taken);
  return slug;
};

const main = async () => {
  if (await columnExists("slug")) {
    console.log("Column 'slug' already exists — skipping ADD COLUMN.");
  } else {
    console.log("Adding nullable 'slug' column...");
    await db.execute(sql`ALTER TABLE "playlists" ADD COLUMN "slug" text`);
  }

  const playlistRows = rowsOf(
    await db.execute(
      sql`SELECT id, category_slug, title, slug FROM "playlists" ORDER BY id`,
    ),
  );

  const takenByCategory = new Map<string, Set<string>>();
  for (const row of playlistRows) {
    const slug = (row.slug as string | null) ?? "";
    if (slug) {
      const category = row.category_slug as string;
      const set = takenByCategory.get(category) ?? new Set<string>();
      set.add(slug);
      takenByCategory.set(category, set);
    }
  }

  let backfilled = 0;
  for (const row of playlistRows) {
    const existing = (row.slug as string | null) ?? "";
    if (existing) continue;
    const id = row.id as string;
    const category = row.category_slug as string;
    const title = row.title as string;
    const slug = uniqueSlugInCategory(category, slugify(title), takenByCategory);
    await db.execute(sql`UPDATE "playlists" SET "slug" = ${slug} WHERE "id" = ${id}`);
    console.log(`  ${id} (${category}) -> ${slug}`);
    backfilled += 1;
  }
  console.log(`Backfilled ${backfilled} playlist slug(s).`);

  console.log("Enforcing NOT NULL on 'slug'...");
  await db.execute(sql`ALTER TABLE "playlists" ALTER COLUMN "slug" SET NOT NULL`);

  console.log("Creating unique index on (category_slug, slug)...");
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS "playlists_category_slug_slug_unique"
        ON "playlists" USING btree ("category_slug", "slug")`,
  );

  for (const migration of MIGRATIONS) {
    const already = rowsOf(
      await db.execute(
        sql`SELECT 1 FROM drizzle.__drizzle_migrations
            WHERE created_at = ${migration.when}`,
      ),
    );
    if (already.length > 0) {
      console.log(`Migration record ${migration.file} already present.`);
      continue;
    }
    await db.execute(
      sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
          VALUES (${migrationHash(migration.file)}, ${migration.when})`,
    );
    console.log(`Recorded migration ${migration.file}.`);
  }

  console.log("Done.");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
