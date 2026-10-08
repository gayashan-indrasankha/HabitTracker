ALTER TABLE "goals" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "time_block_revisions" ADD COLUMN "end_date" date;--> statement-breakpoint
ALTER TABLE "time_block_revisions" ADD COLUMN "is_fixed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "time_block_revisions" ADD COLUMN "task_id" uuid;--> statement-breakpoint
ALTER TABLE "time_block_revisions" ADD COLUMN "goal_id" uuid;--> statement-breakpoint
ALTER TABLE "time_block_revisions" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "time_block_revisions" ADD CONSTRAINT "time_block_revisions_task_owner_fk" FOREIGN KEY ("user_id","task_id") REFERENCES "public"."tasks"("user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_block_revisions" ADD CONSTRAINT "time_block_revisions_goal_owner_fk" FOREIGN KEY ("user_id","goal_id") REFERENCES "public"."goals"("user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_block_revisions" ADD CONSTRAINT "time_block_revisions_project_owner_fk" FOREIGN KEY ("user_id","project_id") REFERENCES "public"."projects"("user_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
UPDATE "time_block_revisions" r SET "end_date" = b."end_date", "is_fixed" = b."is_fixed", "task_id" = b."task_id", "goal_id" = b."goal_id", "project_id" = b."project_id"
FROM "time_blocks" b WHERE r."block_id" = b."id" AND r."user_id" = b."user_id";
