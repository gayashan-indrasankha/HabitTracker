UPDATE "goals"
SET "area" = CASE "area"
  WHEN 'Health & Fitness' THEN 'Fitness'
  WHEN 'Career & Business' THEN 'Career'
  WHEN 'Mental & Emotional Well-being' THEN 'Emotional Well-bein'
  WHEN 'Fun & Recreation' THEN 'Fun'
END
WHERE "area" IN ('Health & Fitness', 'Career & Business', 'Mental & Emotional Well-being', 'Fun & Recreation');
--> statement-breakpoint
UPDATE "tasks"
SET "area" = CASE "area"
  WHEN 'Health & Fitness' THEN 'Fitness'
  WHEN 'Career & Business' THEN 'Career'
  WHEN 'Mental & Emotional Well-being' THEN 'Emotional Well-bein'
  WHEN 'Fun & Recreation' THEN 'Fun'
END
WHERE "area" IN ('Health & Fitness', 'Career & Business', 'Mental & Emotional Well-being', 'Fun & Recreation');
--> statement-breakpoint
UPDATE "time_blocks"
SET "category" = CASE "category"
  WHEN 'Health & Fitness' THEN 'Fitness'
  WHEN 'Career & Business' THEN 'Career'
  WHEN 'Mental & Emotional Well-being' THEN 'Emotional Well-bein'
  WHEN 'Fun & Recreation' THEN 'Fun'
END
WHERE "category" IN ('Health & Fitness', 'Career & Business', 'Mental & Emotional Well-being', 'Fun & Recreation');
--> statement-breakpoint
UPDATE "time_block_revisions"
SET "category" = CASE "category"
  WHEN 'Health & Fitness' THEN 'Fitness'
  WHEN 'Career & Business' THEN 'Career'
  WHEN 'Mental & Emotional Well-being' THEN 'Emotional Well-bein'
  WHEN 'Fun & Recreation' THEN 'Fun'
END
WHERE "category" IN ('Health & Fitness', 'Career & Business', 'Mental & Emotional Well-being', 'Fun & Recreation');
