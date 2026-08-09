CREATE TYPE "enrollmentStatus" AS ENUM('active', 'break', 'dropped', 'inactive');--> statement-breakpoint
ALTER TABLE "enrollment" ADD COLUMN "status" "enrollmentStatus" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "enrollment" ADD COLUMN "leftDate" timestamp;