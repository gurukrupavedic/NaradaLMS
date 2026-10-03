CREATE TABLE "examSchedule" (
	"id" uuid PRIMARY KEY NOT NULL,
	"courseId" uuid NOT NULL,
	"dayOfWeek" integer NOT NULL,
	"startTime" time NOT NULL,
	"timeZone" text NOT NULL,
	"slotCount" integer NOT NULL,
	"slotMinutes" integer NOT NULL,
	"createdBy" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "examSchedule_dayOfWeek_range" CHECK ("examSchedule"."dayOfWeek" BETWEEN 0 AND 6),
	CONSTRAINT "examSchedule_slotCount_positive" CHECK ("examSchedule"."slotCount" BETWEEN 1 AND 24),
	CONSTRAINT "examSchedule_slotMinutes_positive" CHECK ("examSchedule"."slotMinutes" BETWEEN 5 AND 480)
);
--> statement-breakpoint
ALTER TABLE "examSlot" ADD COLUMN "scheduleId" uuid;--> statement-breakpoint
ALTER TABLE "examSchedule" ADD CONSTRAINT "examSchedule_courseId_course_id_fk" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "examSchedule" ADD CONSTRAINT "examSchedule_createdBy_profile_id_fk" FOREIGN KEY ("createdBy") REFERENCES "profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "examSchedule_courseId_idx" ON "examSchedule" USING btree ("courseId");--> statement-breakpoint
ALTER TABLE "examSlot" ADD CONSTRAINT "examSlot_scheduleId_examSchedule_id_fk" FOREIGN KEY ("scheduleId") REFERENCES "examSchedule"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "examSlot_scheduleId_scheduledAt_uidx" ON "examSlot" USING btree ("scheduleId","scheduledAt") WHERE "examSlot"."scheduleId" IS NOT NULL;