UPDATE "goals"
SET "area" = CASE "area"
  WHEN 'University' THEN 'Education & Skills'
  WHEN 'Career' THEN 'Career & Business'
  WHEN 'Industry Project' THEN 'Career & Business'
  WHEN 'Interview Preparation' THEN 'Career & Business'
  WHEN 'Fitness' THEN 'Health & Fitness'
  WHEN 'Communication' THEN 'Personal Development'
  WHEN 'Reading' THEN 'Education & Skills'
  WHEN 'Sleep & Recovery' THEN 'Health & Fitness'
END
WHERE "area" IN ('University', 'Career', 'Industry Project', 'Interview Preparation', 'Fitness', 'Communication', 'Reading', 'Sleep & Recovery');
--> statement-breakpoint
UPDATE "tasks"
SET "area" = CASE "area"
  WHEN 'University' THEN 'Education & Skills'
  WHEN 'Career' THEN 'Career & Business'
  WHEN 'Industry Project' THEN 'Career & Business'
  WHEN 'Interview Preparation' THEN 'Career & Business'
  WHEN 'Fitness' THEN 'Health & Fitness'
  WHEN 'Communication' THEN 'Personal Development'
  WHEN 'Reading' THEN 'Education & Skills'
  WHEN 'Sleep & Recovery' THEN 'Health & Fitness'
END
WHERE "area" IN ('University', 'Career', 'Industry Project', 'Interview Preparation', 'Fitness', 'Communication', 'Reading', 'Sleep & Recovery');
--> statement-breakpoint
UPDATE "time_blocks"
SET "category" = CASE "category"
  WHEN 'University' THEN 'Education & Skills'
  WHEN 'Career' THEN 'Career & Business'
  WHEN 'Industry Project' THEN 'Career & Business'
  WHEN 'Interview Preparation' THEN 'Career & Business'
  WHEN 'Fitness' THEN 'Health & Fitness'
  WHEN 'Communication' THEN 'Personal Development'
  WHEN 'Reading' THEN 'Education & Skills'
  WHEN 'Sleep & Recovery' THEN 'Health & Fitness'
END
WHERE "category" IN ('University', 'Career', 'Industry Project', 'Interview Preparation', 'Fitness', 'Communication', 'Reading', 'Sleep & Recovery');
--> statement-breakpoint
UPDATE "time_block_revisions"
SET "category" = CASE "category"
  WHEN 'University' THEN 'Education & Skills'
  WHEN 'Career' THEN 'Career & Business'
  WHEN 'Industry Project' THEN 'Career & Business'
  WHEN 'Interview Preparation' THEN 'Career & Business'
  WHEN 'Fitness' THEN 'Health & Fitness'
  WHEN 'Communication' THEN 'Personal Development'
  WHEN 'Reading' THEN 'Education & Skills'
  WHEN 'Sleep & Recovery' THEN 'Health & Fitness'
END
WHERE "category" IN ('University', 'Career', 'Industry Project', 'Interview Preparation', 'Fitness', 'Communication', 'Reading', 'Sleep & Recovery');
