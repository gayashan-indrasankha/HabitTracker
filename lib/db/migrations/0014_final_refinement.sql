CREATE TABLE "habit_schedule_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"habit_id" uuid NOT NULL,
	"effective_date" date NOT NULL,
	"schedule" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"source" varchar(20) DEFAULT 'recorded' NOT NULL,
	CONSTRAINT "habit_schedule_revisions_habit_date_unique" UNIQUE("habit_id","effective_date")
);
--> statement-breakpoint
CREATE TABLE "meal_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"meal_id" uuid NOT NULL,
	"date" date NOT NULL,
	"status" varchar(20) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meal_logs_meal_date_unique" UNIQUE("meal_id","date")
);
--> statement-breakpoint
CREATE TABLE "meal_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"notes" text,
	"preferred_time" varchar(5),
	"planned_calories" integer,
	"planned_protein" integer,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meal_templates_user_id_id_unique" UNIQUE("user_id","id")
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "nutrition_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "habit_schedule_revisions" ADD CONSTRAINT "habit_schedule_revisions_owner_fk" FOREIGN KEY ("user_id","habit_id") REFERENCES "public"."habits"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_owner_fk" FOREIGN KEY ("user_id","meal_id") REFERENCES "public"."meal_templates"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_templates" ADD CONSTRAINT "meal_templates_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Only the current legacy rule is known. Do not infer earlier schedules or archive dates.
INSERT INTO "habit_schedule_revisions" ("user_id", "habit_id", "effective_date", "schedule", "start_date", "end_date", "status", "source")
SELECT h."user_id", h."id",
  GREATEST(h."start_date", (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(s."timezone", 'Asia/Colombo'))::date),
  h."schedule", h."start_date", h."end_date",
  CASE WHEN h."archived" THEN 'archived' ELSE 'active' END, 'legacy'
FROM "habits" h LEFT JOIN "user_settings" s ON s."user_id" = h."user_id";
--> statement-breakpoint
CREATE INDEX "habit_schedule_revisions_user_date_idx" ON "habit_schedule_revisions" USING btree ("user_id","effective_date");--> statement-breakpoint
CREATE INDEX "meal_logs_user_date_idx" ON "meal_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "meal_templates_user_sort_idx" ON "meal_templates" USING btree ("user_id","sort_order");
