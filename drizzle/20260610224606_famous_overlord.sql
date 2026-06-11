CREATE TABLE "queued_playlist_cards" (
	"playlist_id" text NOT NULL,
	"queued_card_id" text NOT NULL,
	CONSTRAINT "queued_playlist_cards_playlist_id_queued_card_id_pk" PRIMARY KEY("playlist_id","queued_card_id")
);
--> statement-breakpoint
ALTER TABLE "queued_cards" DROP CONSTRAINT "queued_cards_playlist_id_playlists_id_fk";
--> statement-breakpoint
ALTER TABLE "queued_playlist_cards" ADD CONSTRAINT "queued_playlist_cards_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queued_playlist_cards" ADD CONSTRAINT "queued_playlist_cards_queued_card_id_queued_cards_id_fk" FOREIGN KEY ("queued_card_id") REFERENCES "public"."queued_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queued_cards" DROP COLUMN "playlist_id";