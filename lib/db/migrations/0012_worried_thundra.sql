CREATE TABLE "milestone_review_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"task_id" uuid NOT NULL,
	"state" varchar(24) NOT NULL,
	"reviewer" varchar(80) NOT NULL,
	"reviewed_on" date,
	"criteria_snapshot" text NOT NULL,
	"repository_url" text,
	"test_reference" text,
	"documentation_url" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "milestone_review_history" ADD CONSTRAINT "milestone_review_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_review_history" ADD CONSTRAINT "milestone_review_history_owner_fk" FOREIGN KEY ("user_id","task_id") REFERENCES "public"."tasks"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "milestone_review_history_user_task_idx" ON "milestone_review_history" USING btree ("user_id","task_id");