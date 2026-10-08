CREATE TABLE "time_block_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"block_id" uuid NOT NULL,
	"effective_date" date NOT NULL,
	"title" varchar(160) NOT NULL,
	"category" varchar(80) NOT NULL,
	"local_start_time" varchar(5) NOT NULL,
	"local_end_time" varchar(5) NOT NULL,
	"weekday_mask" varchar(7) NOT NULL,
	"status" varchar(20) NOT NULL,
	CONSTRAINT "time_block_revisions_block_date_unique" UNIQUE("block_id","effective_date")
);
--> statement-breakpoint
ALTER TABLE "time_block_revisions" ADD CONSTRAINT "time_block_revisions_owner_fk" FOREIGN KEY ("user_id","block_id") REFERENCES "public"."time_blocks"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "time_block_revisions_user_date_idx" ON "time_block_revisions" USING btree ("user_id","effective_date");
--> statement-breakpoint
INSERT INTO "time_block_revisions" ("user_id", "block_id", "effective_date", "title", "category", "local_start_time", "local_end_time", "weekday_mask", "status")
SELECT b."user_id", b."id", b."start_date", b."title", b."category", b."local_start_time", b."local_end_time", b."weekday_mask",
  CASE WHEN b."status" = 'active' OR b."start_date" < COALESCE((CURRENT_TIMESTAMP AT TIME ZONE s."timezone")::date, CURRENT_DATE) THEN 'active' ELSE b."status" END
FROM "time_blocks" b LEFT JOIN "user_settings" s ON s."user_id" = b."user_id";
--> statement-breakpoint
INSERT INTO "time_block_revisions" ("user_id", "block_id", "effective_date", "title", "category", "local_start_time", "local_end_time", "weekday_mask", "status")
SELECT b."user_id", b."id", COALESCE((CURRENT_TIMESTAMP AT TIME ZONE s."timezone")::date, CURRENT_DATE), b."title", b."category", b."local_start_time", b."local_end_time", b."weekday_mask", b."status"
FROM "time_blocks" b LEFT JOIN "user_settings" s ON s."user_id" = b."user_id"
WHERE b."status" <> 'active' AND b."start_date" < COALESCE((CURRENT_TIMESTAMP AT TIME ZONE s."timezone")::date, CURRENT_DATE);
