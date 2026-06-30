CREATE TABLE "user_category_level" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"level" integer DEFAULT 2 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_category_level_user_id_category_unique" UNIQUE("user_id","category")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "reassessment_interval_weeks" integer;--> statement-breakpoint
ALTER TABLE "user_category_level" ADD CONSTRAINT "user_category_level_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;