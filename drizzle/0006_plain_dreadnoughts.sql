CREATE TYPE "public"."consultation_status" AS ENUM('pending', 'scheduled', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."crop_type" AS ENUM('rice', 'wheat', 'maize', 'cotton', 'sugarcane', 'soybean', 'groundnut', 'pulses', 'vegetables', 'fruits', 'other');--> statement-breakpoint
CREATE TABLE "consultations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"location" text NOT NULL,
	"farm_size" text NOT NULL,
	"main_crop" "crop_type" NOT NULL,
	"visit_date" timestamp with time zone,
	"message" text,
	"status" "consultation_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
