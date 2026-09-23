CREATE TYPE "examSlotRequestStatus" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "examSlotStatus" AS ENUM('open', 'requested', 'booked', 'cancelled');--> statement-breakpoint
CREATE TABLE "examSlot" (
	"id" uuid PRIMARY KEY NOT NULL,
	"trackId" uuid NOT NULL,
	"scheduledAt" timestamp NOT NULL,
	"status" "examSlotStatus" DEFAULT 'open' NOT NULL,
	"openedBy" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "examSlot" ADD CONSTRAINT "examSlot_trackId_track_id_fk" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "examSlot" ADD CONSTRAINT "examSlot_openedBy_profile_id_fk" FOREIGN KEY ("openedBy") REFERENCES "profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "examSlot_trackId_status_scheduledAt_idx" ON "examSlot" USING btree ("trackId","status","scheduledAt");--> statement-breakpoint
CREATE UNIQUE INDEX "examSlot_id_trackId_uidx" ON "examSlot" USING btree ("id","trackId");