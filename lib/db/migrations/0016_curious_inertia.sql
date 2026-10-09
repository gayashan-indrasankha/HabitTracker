CREATE TABLE "life_os_seed_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"item_type" varchar(32) NOT NULL,
	"template_key" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "life_os_seed_items" ADD CONSTRAINT "life_os_seed_items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "life_os_seed_items_user_type_key_idx" ON "life_os_seed_items" USING btree ("user_id","item_type","template_key");