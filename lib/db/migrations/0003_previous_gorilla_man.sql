CREATE TABLE "day_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"mode" varchar(12) DEFAULT 'normal' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "day_plans_user_date_unique" UNIQUE("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"area" varchar(80) NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"priority" smallint DEFAULT 2 NOT NULL,
	"target_date" date,
	"target_value" double precision,
	"target_unit" varchar(32),
	"template_key" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_user_id_id_unique" UNIQUE("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "metric_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"type" varchar(60) NOT NULL,
	"value" double precision NOT NULL,
	"unit" varchar(24) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"goal_id" uuid,
	"name" varchar(160) NOT NULL,
	"description" text,
	"type" varchar(60) DEFAULT 'General' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"deadline" date,
	"repository_url" text,
	"template_key" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_user_id_id_unique" UNIQUE("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"slot" smallint NOT NULL,
	"name" varchar(120),
	"target_grade" varchar(20),
	"actual_grade" varchar(20),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subjects_user_slot_unique" UNIQUE("user_id","slot")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"goal_id" uuid,
	"project_id" uuid,
	"title" varchar(160) NOT NULL,
	"details" text,
	"area" varchar(80) DEFAULT 'Personal Development' NOT NULL,
	"status" varchar(20) DEFAULT 'todo' NOT NULL,
	"priority" smallint DEFAULT 2 NOT NULL,
	"estimated_minutes" integer,
	"actual_minutes" integer,
	"due_date" date,
	"scheduled_date" date,
	"daily_priority" smallint,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_milestone" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_user_id_id_unique" UNIQUE("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "time_block_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"block_id" uuid NOT NULL,
	"occurrence_date" date NOT NULL,
	"override_date" date,
	"override_start_time" varchar(5),
	"override_end_time" varchar(5),
	"status" varchar(20) NOT NULL,
	"reason" text,
	"actual_minutes" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "time_block_exceptions_block_date_unique" UNIQUE("block_id","occurrence_date")
);
--> statement-breakpoint
CREATE TABLE "time_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" varchar(160) NOT NULL,
	"category" varchar(80) NOT NULL,
	"local_start_time" varchar(5) NOT NULL,
	"local_end_time" varchar(5) NOT NULL,
	"weekday_mask" varchar(7) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"is_fixed" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"goal_id" uuid,
	"project_id" uuid,
	"task_id" uuid,
	"template_key" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "time_blocks_user_id_id_unique" UNIQUE("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "weekly_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"week_start" date NOT NULL,
	"answers" text DEFAULT '{}' NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_reviews_user_week_unique" UNIQUE("user_id","week_start")
);
--> statement-breakpoint
ALTER TABLE "day_plans" ADD CONSTRAINT "day_plans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_entries" ADD CONSTRAINT "metric_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_goal_owner_fk" FOREIGN KEY ("user_id","goal_id") REFERENCES "public"."goals"("user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_goal_owner_fk" FOREIGN KEY ("user_id","goal_id") REFERENCES "public"."goals"("user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_owner_fk" FOREIGN KEY ("user_id","project_id") REFERENCES "public"."projects"("user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_block_exceptions" ADD CONSTRAINT "time_block_exceptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_block_exceptions" ADD CONSTRAINT "time_block_exceptions_owner_fk" FOREIGN KEY ("user_id","block_id") REFERENCES "public"."time_blocks"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_goal_owner_fk" FOREIGN KEY ("user_id","goal_id") REFERENCES "public"."goals"("user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_project_owner_fk" FOREIGN KEY ("user_id","project_id") REFERENCES "public"."projects"("user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_task_owner_fk" FOREIGN KEY ("user_id","task_id") REFERENCES "public"."tasks"("user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_reviews" ADD CONSTRAINT "weekly_reviews_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goals_user_status_idx" ON "goals" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "goals_user_template_idx" ON "goals" USING btree ("user_id","template_key");--> statement-breakpoint
CREATE INDEX "metric_entries_user_type_date_idx" ON "metric_entries" USING btree ("user_id","type","date");--> statement-breakpoint
CREATE INDEX "projects_user_status_idx" ON "projects" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_user_template_idx" ON "projects" USING btree ("user_id","template_key");--> statement-breakpoint
CREATE INDEX "tasks_user_schedule_idx" ON "tasks" USING btree ("user_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "tasks_user_project_idx" ON "tasks" USING btree ("user_id","project_id");--> statement-breakpoint
CREATE INDEX "time_block_exceptions_user_date_idx" ON "time_block_exceptions" USING btree ("user_id","occurrence_date");--> statement-breakpoint
CREATE INDEX "time_blocks_user_dates_idx" ON "time_blocks" USING btree ("user_id","start_date","end_date");--> statement-breakpoint
CREATE UNIQUE INDEX "time_blocks_user_template_idx" ON "time_blocks" USING btree ("user_id","template_key");--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_id_unique" UNIQUE("user_id","id");--> statement-breakpoint
ALTER TABLE "habit_entries" ADD CONSTRAINT "habit_entries_owner_fk" FOREIGN KEY ("user_id","habit_id") REFERENCES "public"."habits"("user_id","id") ON DELETE cascade ON UPDATE no action;
