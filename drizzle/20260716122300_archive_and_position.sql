ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "archived" boolean DEFAULT false NOT NULL;
ALTER TABLE "playlists" ADD COLUMN IF NOT EXISTS "position" integer DEFAULT 0 NOT NULL;
ALTER TABLE "card_categories" ADD COLUMN IF NOT EXISTS "position" integer DEFAULT 0 NOT NULL;
ALTER TABLE "playlist_cards" ADD COLUMN IF NOT EXISTS "position" integer DEFAULT 0 NOT NULL;
