-- Courses. Hand-ordered from drizzle-kit's output, which (a) added the composite foreign keys
-- before the unique indexes they reference and (b) added NOT NULL columns with no backfill — the
-- API runs this on boot against every existing school, so it has to work on a school that already
-- has data, not just an empty one.
--
-- Everything that existed before courses belongs to the school's single course, Vedam, so a school
-- with any tracks, batches or registrations gets that one course and is backfilled into it. A
-- brand-new empty school gets no course row here; the importer/seed creates it.
CREATE TABLE "course" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "course_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
INSERT INTO "course" ("id", "slug", "name")
SELECT gen_random_uuid(), 'vedam', 'Vedam'
WHERE EXISTS (SELECT 1 FROM "track") OR EXISTS (SELECT 1 FROM "batch") OR EXISTS (SELECT 1 FROM "registration");--> statement-breakpoint
ALTER TABLE "track" ADD COLUMN "courseId" uuid;--> statement-breakpoint
ALTER TABLE "batch" ADD COLUMN "courseId" uuid;--> statement-breakpoint
ALTER TABLE "enrollment" ADD COLUMN "courseId" uuid;--> statement-breakpoint
ALTER TABLE "registration" ADD COLUMN "courseId" uuid;--> statement-breakpoint
UPDATE "track" SET "courseId" = (SELECT "id" FROM "course" WHERE "slug" = 'vedam');--> statement-breakpoint
UPDATE "batch" SET "courseId" = "track"."courseId" FROM "track" WHERE "track"."id" = "batch"."trackId";--> statement-breakpoint
UPDATE "enrollment" SET "courseId" = "batch"."courseId" FROM "batch" WHERE "batch"."id" = "enrollment"."batchId";--> statement-breakpoint
UPDATE "registration" SET "courseId" = (SELECT "id" FROM "course" WHERE "slug" = 'vedam');--> statement-breakpoint
ALTER TABLE "track" ALTER COLUMN "courseId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "batch" ALTER COLUMN "courseId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "enrollment" ALTER COLUMN "courseId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "registration" ALTER COLUMN "courseId" SET NOT NULL;--> statement-breakpoint
DROP INDEX "track_order_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "track_courseId_order_uidx" ON "track" USING btree ("courseId","order");--> statement-breakpoint
CREATE UNIQUE INDEX "track_id_courseId_uidx" ON "track" USING btree ("id","courseId");--> statement-breakpoint
CREATE UNIQUE INDEX "batch_id_courseId_uidx" ON "batch" USING btree ("id","courseId");--> statement-breakpoint
CREATE INDEX "batch_courseId_idx" ON "batch" USING btree ("courseId");--> statement-breakpoint
ALTER TABLE "track" ADD CONSTRAINT "track_courseId_course_id_fk" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration" ADD CONSTRAINT "registration_courseId_course_id_fk" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch" ADD CONSTRAINT "batch_trackId_courseId_fk" FOREIGN KEY ("trackId","courseId") REFERENCES "track"("id","courseId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_batchId_courseId_fk" FOREIGN KEY ("batchId","courseId") REFERENCES "batch"("id","courseId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Last, so a school whose existing data already has a student in two live batches fails here with
-- Postgres naming the duplicate profile, rather than midway through the backfill.
CREATE UNIQUE INDEX "enrollment_one_active_student_seat_per_course" ON "enrollment" USING btree ("profileId","courseId") WHERE "enrollment"."role" = 'student' AND "enrollment"."status" = 'active';
