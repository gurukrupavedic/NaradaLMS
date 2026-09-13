ALTER TABLE "batch" ADD COLUMN "enrollmentOpensAt" timestamp;--> statement-breakpoint
ALTER TABLE "batch" ADD COLUMN "enrollmentClosesAt" timestamp;--> statement-breakpoint
ALTER TABLE "batch" ADD COLUMN "capacity" integer;