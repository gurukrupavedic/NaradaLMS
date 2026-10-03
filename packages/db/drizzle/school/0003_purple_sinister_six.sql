ALTER TABLE "examSlot" DROP CONSTRAINT "examSlot_trackId_track_id_fk";
--> statement-breakpoint
ALTER TABLE "examSlotRequest" DROP CONSTRAINT "examSlotRequest_slotId_trackId_fk";
--> statement-breakpoint
DROP INDEX "examSlot_trackId_status_scheduledAt_idx";--> statement-breakpoint
DROP INDEX "examSlot_id_trackId_uidx";--> statement-breakpoint
DROP INDEX "examSlotRequest_one_pending_per_student_track_uidx";--> statement-breakpoint
ALTER TABLE "examSlot" ADD COLUMN "courseId" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "examSlot" ADD CONSTRAINT "examSlot_courseId_course_id_fk" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "examSlotRequest" ADD CONSTRAINT "examSlotRequest_trackId_track_id_fk" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "examSlot_courseId_status_scheduledAt_idx" ON "examSlot" USING btree ("courseId","status","scheduledAt");--> statement-breakpoint
CREATE UNIQUE INDEX "examSlotRequest_one_pending_per_student_uidx" ON "examSlotRequest" USING btree ("studentId") WHERE "examSlotRequest"."status" = 'pending';--> statement-breakpoint
ALTER TABLE "examSlot" DROP COLUMN "trackId";
