CREATE TYPE "enrollmentRequestStatus" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "enrollmentRequest" (
	"id" uuid PRIMARY KEY NOT NULL,
	"status" "enrollmentRequestStatus" DEFAULT 'pending' NOT NULL,
	"profileId" uuid NOT NULL,
	"batchId" uuid NOT NULL,
	"reviewedAt" timestamp,
	"reviewedBy" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "enrollmentRequest" ADD CONSTRAINT "enrollmentRequest_profileId_profile_id_fk" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollmentRequest" ADD CONSTRAINT "enrollmentRequest_batchId_batch_id_fk" FOREIGN KEY ("batchId") REFERENCES "batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollmentRequest" ADD CONSTRAINT "enrollmentRequest_reviewedBy_profile_id_fk" FOREIGN KEY ("reviewedBy") REFERENCES "profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "enrollmentRequest_status_createdAt_idx" ON "enrollmentRequest" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "enrollmentRequest_batchId_idx" ON "enrollmentRequest" USING btree ("batchId");