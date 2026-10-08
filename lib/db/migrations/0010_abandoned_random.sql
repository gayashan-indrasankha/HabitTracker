ALTER TABLE "day_plans" ADD COLUMN "minimum_habit_id" uuid;--> statement-breakpoint
ALTER TABLE "day_plans" ADD COLUMN "minimum_action" varchar(160);--> statement-breakpoint
ALTER TABLE "day_plans" ADD COLUMN "minimum_action_done" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "day_plans" ADD CONSTRAINT "day_plans_minimum_habit_owner_fk" FOREIGN KEY ("user_id","minimum_habit_id") REFERENCES "public"."habits"("user_id","id") ON DELETE no action ON UPDATE no action;