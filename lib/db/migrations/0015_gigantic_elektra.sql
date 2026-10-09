ALTER TABLE "interview_topics" ADD COLUMN "template_key" varchar(100);--> statement-breakpoint
ALTER TABLE "meal_templates" ADD COLUMN "template_key" varchar(100);--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "template_key" varchar(100);--> statement-breakpoint
CREATE UNIQUE INDEX "interview_topics_user_template_idx" ON "interview_topics" USING btree ("user_id","template_key");--> statement-breakpoint
CREATE UNIQUE INDEX "meal_templates_user_template_idx" ON "meal_templates" USING btree ("user_id","template_key");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_user_template_idx" ON "tasks" USING btree ("user_id","template_key");