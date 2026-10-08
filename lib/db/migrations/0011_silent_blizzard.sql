CREATE TABLE "application_stage_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"application_id" uuid NOT NULL,
	"from_stage" varchar(32),
	"to_stage" varchar(32) NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "english_practices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"type" varchar(40) NOT NULL,
	"topic" varchar(160) NOT NULL,
	"duration_minutes" integer NOT NULL,
	"fluency" smallint,
	"grammar" smallint,
	"clarity" smallint,
	"pronunciation" smallint,
	"confidence" smallint,
	"reviewer" varchar(80),
	"reflection" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "english_practices_user_id_id_unique" UNIQUE("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "grammar_mistakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"practice_id" uuid,
	"original" text NOT NULL,
	"corrected" text NOT NULL,
	"category" varchar(80) NOT NULL,
	"note" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internship_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"company" varchar(160) NOT NULL,
	"role_title" varchar(160) NOT NULL,
	"role_track" varchar(16) NOT NULL,
	"url" text,
	"location" varchar(160),
	"arrangement" varchar(24),
	"applied_on" date,
	"stage" varchar(32) DEFAULT 'saved' NOT NULL,
	"follow_up_date" date,
	"contact_name" varchar(160),
	"note" text,
	"follow_up_task_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "internship_applications_user_id_id_unique" UNIQUE("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "interview_practices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"topic_id" uuid NOT NULL,
	"date" date NOT NULL,
	"role_track" varchar(16) NOT NULL,
	"type" varchar(40) NOT NULL,
	"prompt" text,
	"duration_minutes" integer,
	"technical" smallint,
	"approach" smallint,
	"clarity" smallint,
	"tradeoffs" smallint,
	"external_rating" smallint,
	"strengths" text,
	"weaknesses" text,
	"next_action" text,
	"follow_up_task_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"category" varchar(80) NOT NULL,
	"title" varchar(160) NOT NULL,
	"role_track" varchar(16) DEFAULT 'Shared' NOT NULL,
	CONSTRAINT "interview_topics_user_id_id_unique" UNIQUE("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "milestone_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"task_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"met" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestone_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"task_id" uuid NOT NULL,
	"state" varchar(24) DEFAULT 'not_reviewed' NOT NULL,
	"reviewer" varchar(80) DEFAULT 'Self-review' NOT NULL,
	"reviewed_on" date,
	"repository_url" text,
	"test_reference" text,
	"documentation_url" text,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "milestone_reviews_user_task_unique" UNIQUE("user_id","task_id")
);
--> statement-breakpoint
CREATE TABLE "subject_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"title" varchar(160) NOT NULL,
	"priority" smallint DEFAULT 2 NOT NULL,
	"status" varchar(24) DEFAULT 'not_started' NOT NULL,
	"next_revision_date" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subject_topics_user_id_id_unique" UNIQUE("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "topic_practices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"topic_id" uuid NOT NULL,
	"date" date NOT NULL,
	"type" varchar(32) NOT NULL,
	"correct" integer,
	"total" integer,
	"confidence" smallint,
	"duration_minutes" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_stage_history" ADD CONSTRAINT "application_stage_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_stage_history" ADD CONSTRAINT "application_stage_history_owner_fk" FOREIGN KEY ("user_id","application_id") REFERENCES "public"."internship_applications"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "english_practices" ADD CONSTRAINT "english_practices_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grammar_mistakes" ADD CONSTRAINT "grammar_mistakes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grammar_mistakes" ADD CONSTRAINT "grammar_mistakes_practice_owner_fk" FOREIGN KEY ("user_id","practice_id") REFERENCES "public"."english_practices"("user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_applications" ADD CONSTRAINT "internship_applications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_applications" ADD CONSTRAINT "internship_applications_task_owner_fk" FOREIGN KEY ("user_id","follow_up_task_id") REFERENCES "public"."tasks"("user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_practices" ADD CONSTRAINT "interview_practices_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_practices" ADD CONSTRAINT "interview_practices_owner_fk" FOREIGN KEY ("user_id","topic_id") REFERENCES "public"."interview_topics"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_practices" ADD CONSTRAINT "interview_practices_task_owner_fk" FOREIGN KEY ("user_id","follow_up_task_id") REFERENCES "public"."tasks"("user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_topics" ADD CONSTRAINT "interview_topics_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_criteria" ADD CONSTRAINT "milestone_criteria_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_criteria" ADD CONSTRAINT "milestone_criteria_owner_fk" FOREIGN KEY ("user_id","task_id") REFERENCES "public"."tasks"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_reviews" ADD CONSTRAINT "milestone_reviews_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_reviews" ADD CONSTRAINT "milestone_reviews_owner_fk" FOREIGN KEY ("user_id","task_id") REFERENCES "public"."tasks"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_topics" ADD CONSTRAINT "subject_topics_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_topics" ADD CONSTRAINT "subject_topics_owner_fk" FOREIGN KEY ("user_id","subject_id") REFERENCES "public"."subjects"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_practices" ADD CONSTRAINT "topic_practices_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_practices" ADD CONSTRAINT "topic_practices_owner_fk" FOREIGN KEY ("user_id","topic_id") REFERENCES "public"."subject_topics"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_stage_history_user_date_idx" ON "application_stage_history" USING btree ("user_id","changed_at");--> statement-breakpoint
CREATE INDEX "english_practices_user_date_idx" ON "english_practices" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "grammar_mistakes_user_review_idx" ON "grammar_mistakes" USING btree ("user_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "internship_applications_user_stage_idx" ON "internship_applications" USING btree ("user_id","stage");--> statement-breakpoint
CREATE INDEX "internship_applications_user_followup_idx" ON "internship_applications" USING btree ("user_id","follow_up_date");--> statement-breakpoint
CREATE INDEX "interview_practices_user_date_idx" ON "interview_practices" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "interview_topics_user_role_idx" ON "interview_topics" USING btree ("user_id","role_track");--> statement-breakpoint
CREATE INDEX "milestone_criteria_user_task_idx" ON "milestone_criteria" USING btree ("user_id","task_id");--> statement-breakpoint
CREATE INDEX "subject_topics_user_subject_idx" ON "subject_topics" USING btree ("user_id","subject_id");--> statement-breakpoint
CREATE INDEX "topic_practices_user_date_idx" ON "topic_practices" USING btree ("user_id","date");