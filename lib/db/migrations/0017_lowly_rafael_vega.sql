ALTER TABLE "interview_practices" ALTER COLUMN "topic_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "interview_practices" ADD COLUMN "topic_text" varchar(160);--> statement-breakpoint
UPDATE "interview_practices" AS practice
SET "topic_text" = topic."title"
FROM "interview_topics" AS topic
WHERE practice."topic_id" = topic."id" AND practice."user_id" = topic."user_id";
