ALTER TABLE "habits" ADD COLUMN "template_key" varchar(100);--> statement-breakpoint
CREATE UNIQUE INDEX "habits_user_template_idx" ON "habits" USING btree ("user_id","template_key");