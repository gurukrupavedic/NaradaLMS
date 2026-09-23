CREATE TABLE "examSlotRequest" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slotId" uuid NOT NULL,
	"trackId" uuid NOT NULL,
	"studentId" uuid NOT NULL,
	"status" "examSlotRequestStatus" DEFAULT 'pending' NOT NULL,
	"reviewedAt" timestamp,
	"reviewedBy" uuid,
	"examId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "examSlotRequest" ADD CONSTRAINT "examSlotRequest_slotId_examSlot_id_fk" FOREIGN KEY ("slotId") REFERENCES "examSlot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "examSlotRequest" ADD CONSTRAINT "examSlotRequest_studentId_profile_id_fk" FOREIGN KEY ("studentId") REFERENCES "profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "examSlotRequest" ADD CONSTRAINT "examSlotRequest_reviewedBy_profile_id_fk" FOREIGN KEY ("reviewedBy") REFERENCES "profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "examSlotRequest" ADD CONSTRAINT "examSlotRequest_examId_exam_id_fk" FOREIGN KEY ("examId") REFERENCES "exam"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "examSlotRequest" ADD CONSTRAINT "examSlotRequest_slotId_trackId_fk" FOREIGN KEY ("slotId","trackId") REFERENCES "examSlot"("id","trackId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "examSlotRequest_studentId_idx" ON "examSlotRequest" USING btree ("studentId");--> statement-breakpoint
CREATE INDEX "examSlotRequest_status_createdAt_idx" ON "examSlotRequest" USING btree ("status","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "examSlotRequest_one_pending_per_slot_uidx" ON "examSlotRequest" USING btree ("slotId") WHERE "examSlotRequest"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "examSlotRequest_one_pending_per_student_track_uidx" ON "examSlotRequest" USING btree ("studentId","trackId") WHERE "examSlotRequest"."status" = 'pending';