ALTER TABLE "profile" ADD COLUMN "details" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "registration" ADD COLUMN "details" jsonb DEFAULT '{}'::jsonb NOT NULL;