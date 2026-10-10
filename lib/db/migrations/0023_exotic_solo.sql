ALTER TABLE "meal_logs" ALTER COLUMN "status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD COLUMN "actual_calories" integer;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD COLUMN "actual_protein" integer;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD COLUMN "actual_carbs" integer;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD COLUMN "actual_fat" integer;