ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "searchable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "queued_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image" text,
	"date" text,
	"recommended" boolean DEFAULT false NOT NULL,
	"searchable" boolean DEFAULT true NOT NULL,
	"url" text NOT NULL,
	"playlist_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "queued_card_categories" (
	"queued_card_id" text NOT NULL,
	"category_slug" "category_slug" NOT NULL,
	CONSTRAINT "queued_card_categories_queued_card_id_category_slug_pk" PRIMARY KEY("queued_card_id","category_slug")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "queued_card_categories" ADD CONSTRAINT "queued_card_categories_queued_card_id_queued_cards_id_fk" FOREIGN KEY ("queued_card_id") REFERENCES "public"."queued_cards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "queued_card_categories" ADD CONSTRAINT "queued_card_categories_category_slug_categories_slug_fk" FOREIGN KEY ("category_slug") REFERENCES "public"."categories"("slug") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "queued_cards" ADD CONSTRAINT "queued_cards_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
