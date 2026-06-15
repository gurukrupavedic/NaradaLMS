CREATE TYPE "stagedUploadPurpose" AS ENUM('chapterText', 'audio');--> statement-breakpoint
CREATE TYPE "stagedUploadStatus" AS ENUM('pending', 'completed', 'expired');--> statement-breakpoint
CREATE TABLE "stagedUpload" (
	"id" uuid PRIMARY KEY NOT NULL,
	"schoolId" text NOT NULL,
	"chapterId" uuid NOT NULL,
	"purpose" "stagedUploadPurpose" NOT NULL,
	"status" "stagedUploadStatus" DEFAULT 'pending' NOT NULL,
	"objectKey" text NOT NULL,
	"contentType" text NOT NULL,
	"createdByUserId" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stagedUpload" ADD CONSTRAINT "stagedUpload_chapterId_chapter_id_fk" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stagedUpload_chapterId_idx" ON "stagedUpload" USING btree ("chapterId");--> statement-breakpoint
CREATE INDEX "stagedUpload_status_expiresAt_idx" ON "stagedUpload" USING btree ("status","expiresAt");
