ALTER TABLE "enrollment" ADD COLUMN "attendanceScore" smallint;--> statement-breakpoint
ALTER TABLE "enrollment" ADD COLUMN "recitationScore" smallint;--> statement-breakpoint
ALTER TABLE "enrollment" ADD COLUMN "backlogScore" smallint;--> statement-breakpoint
ALTER TABLE "enrollment" ADD COLUMN "scoresUpdatedAt" timestamp;--> statement-breakpoint
ALTER TABLE "enrollment" ADD COLUMN "scoresUpdatedBy" uuid;--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_scoresUpdatedBy_profile_id_fk" FOREIGN KEY ("scoresUpdatedBy") REFERENCES "profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_attendanceScore_range" CHECK ("enrollment"."attendanceScore" IN (-1, 0, 1));--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_recitationScore_range" CHECK ("enrollment"."recitationScore" IN (-1, 0, 1));--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_backlogScore_range" CHECK ("enrollment"."backlogScore" IN (-1, 0, 1));