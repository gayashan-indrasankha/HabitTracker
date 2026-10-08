CREATE TABLE "time_off_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"type" varchar(20) NOT NULL,
	"title" varchar(160),
	"note" text,
	"all_day" boolean DEFAULT true NOT NULL,
	"local_start_time" varchar(5),
	"local_end_time" varchar(5),
	"status" varchar(12) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "time_off_days_user_date_unique" UNIQUE("user_id","date"),
	CONSTRAINT "time_off_days_user_id_id_unique" UNIQUE("user_id","id")
);
--> statement-breakpoint
ALTER TABLE "time_block_exceptions" ADD COLUMN "time_off_id" uuid;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "flexible_capacity_minutes" integer;--> statement-breakpoint
ALTER TABLE "time_off_days" ADD CONSTRAINT "time_off_days_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "time_off_days_user_date_idx" ON "time_off_days" USING btree ("user_id","date");--> statement-breakpoint
ALTER TABLE "time_block_exceptions" ADD CONSTRAINT "time_block_exceptions_time_off_owner_fk" FOREIGN KEY ("user_id","time_off_id") REFERENCES "public"."time_off_days"("user_id","id") ON DELETE no action ON UPDATE no action;