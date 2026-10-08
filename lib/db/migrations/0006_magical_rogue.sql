CREATE TABLE "subject_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"title" varchar(160) NOT NULL,
	"due_date" date,
	"status" varchar(20) DEFAULT 'todo' NOT NULL,
	"actual_grade" varchar(20),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subject_assessments" ADD CONSTRAINT "subject_assessments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_user_id_id_unique" UNIQUE("user_id","id");--> statement-breakpoint
ALTER TABLE "subject_assessments" ADD CONSTRAINT "subject_assessments_owner_fk" FOREIGN KEY ("user_id","subject_id") REFERENCES "public"."subjects"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subject_assessments_user_due_idx" ON "subject_assessments" USING btree ("user_id","due_date");
