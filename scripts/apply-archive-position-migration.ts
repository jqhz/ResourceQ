import { createHash } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";
import { sql } from "drizzle-orm";
import { db } from "../src/utils/db/index";
import { backfillPositions } from "../src/utils/db/ordering";

type Row = Record<string, unknown>;

const rowsOf = (result: { rows?: Row[] } | Row[]): Row[] =>
  Array.isArray(result) ? result : (result.rows ?? []);

const migrationHash = (file: string) =>
  createHash("sha256")
    .update(readFileSync(resolve(process.cwd(), file)).toString())
    .digest("hex");

const MIGRATION = {
  file: "drizzle/20260716122300_archive_and_position.sql",
  when: 1784006580000,
};

const columnExists = async (table: string, column: string) => {
  const result = await db.execute(
    sql`SELECT 1 FROM information_schema.columns
        WHERE table_name = ${table} AND column_name = ${column}`,
  );
  return rowsOf(result).length > 0;
};

const main = async () => {
  const steps = [
    { table: "cards", column: "archived" },
    { table: "playlists", column: "position" },
    { table: "card_categories", column: "position" },
    { table: "playlist_cards", column: "position" },
  ] as const;

  for (const step of steps) {
    if (await columnExists(step.table, step.column)) {
      console.log(`Column ${step.table}.${step.column} already exists.`);
      continue;
    }
    console.log(`Adding ${step.table}.${step.column}...`);
  }

  const sqlFile = readFileSync(
    resolve(process.cwd(), MIGRATION.file),
    "utf8",
  );
  for (const statement of sqlFile.split(";").map((part) => part.trim()).filter(Boolean)) {
    await db.execute(sql.raw(statement));
  }

  console.log("Backfilling position values...");
  await backfillPositions();

  const already = rowsOf(
    await db.execute(
      sql`SELECT 1 FROM drizzle.__drizzle_migrations
          WHERE created_at = ${MIGRATION.when}`,
    ),
  );
  if (already.length === 0) {
    await db.execute(
      sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
          VALUES (${migrationHash(MIGRATION.file)}, ${MIGRATION.when})`,
    );
    console.log(`Recorded migration ${MIGRATION.file}.`);
  }

  console.log("Done.");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
