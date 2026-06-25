CREATE TABLE "assessment_session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date_of_test" date NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"height_cm" real,
	"weight_kg" real,
	"bmi" real,
	"bmi_category" text,
	"overall_score" integer,
	"overall_category" text,
	"walk_test_variant" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "assessment_station_result" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"station" text NOT NULL,
	"raw_data" jsonb NOT NULL,
	"score" real,
	"category" text,
	"unit" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "sex" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "assessment_session" ADD CONSTRAINT "assessment_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_station_result" ADD CONSTRAINT "assessment_station_result_session_id_assessment_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."assessment_session"("id") ON DELETE cascade ON UPDATE no action;