ALTER TABLE "playlists" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "playlists_category_slug_slug_unique" ON "playlists" USING btree ("category_slug","slug");
