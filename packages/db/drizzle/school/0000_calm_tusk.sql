CREATE TYPE "batchStatus" AS ENUM('upcoming', 'active', 'completed');--> statement-breakpoint
CREATE TYPE "chapterStatus" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "enrollmentRole" AS ENUM('instructor', 'ta', 'student');--> statement-breakpoint
CREATE TYPE "enrollmentStatus" AS ENUM('active', 'inactive', 'completed');--> statement-breakpoint
CREATE TYPE "examStatus" AS ENUM('scheduled', 'inProgress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "proficiencyLevel" AS ENUM('absent', 'notStarted', 'practicing', 'level1', 'level2', 'level3', 'level4');--> statement-breakpoint
CREATE TYPE "script" AS ENUM('te', 'sa', 'en');--> statement-breakpoint
CREATE SEQUENCE "chapter_order_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "track_order_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "audioAsset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapterId" uuid NOT NULL,
	"label" text,
	"objectKey" text NOT NULL,
	"duration" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audioMapping" (
	"segmentId" uuid NOT NULL,
	"audioAssetId" uuid NOT NULL,
	"audioStart" real NOT NULL,
	"audioEnd" real NOT NULL,
	CONSTRAINT "audioMapping_segmentId_audioAssetId_pk" PRIMARY KEY("segmentId","audioAssetId")
);
--> statement-breakpoint
CREATE TABLE "batch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"trackId" uuid NOT NULL,
	"startDate" date,
	"status" "batchStatus" DEFAULT 'upcoming' NOT NULL,
	"scheduledAt" timestamp,
	"meetingUrl" text,
	CONSTRAINT "batch_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "chapter" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trackId" uuid NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"status" "chapterStatus" DEFAULT 'draft' NOT NULL,
	"order" integer DEFAULT nextval('chapter_order_seq') NOT NULL,
	"script" "script",
	"textObjectKey" text,
	CONSTRAINT "chapter_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "enrollment" (
	"userId" text NOT NULL,
	"batchId" uuid NOT NULL,
	"phone" text,
	"city" text,
	"role" "enrollmentRole" NOT NULL,
	"status" "enrollmentStatus" DEFAULT 'active' NOT NULL,
	"joinedAt" timestamp DEFAULT now(),
	CONSTRAINT "enrollment_userId_batchId_pk" PRIMARY KEY("userId","batchId")
);
--> statement-breakpoint
CREATE TABLE "evaluation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studentId" text NOT NULL,
	"chapterId" uuid NOT NULL,
	"level" "proficiencyLevel" NOT NULL,
	"notes" text,
	"evaluatorId" text NOT NULL,
	"evaluatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exam" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batchId" uuid NOT NULL,
	"studentId" text NOT NULL,
	"scheduledAt" timestamp NOT NULL,
	"status" "examStatus" DEFAULT 'scheduled' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "examResult" (
	"examId" uuid NOT NULL,
	"chapterId" uuid NOT NULL,
	"evaluationId" uuid NOT NULL,
	CONSTRAINT "examResult_examId_chapterId_pk" PRIMARY KEY("examId","chapterId")
);
--> statement-breakpoint
CREATE TABLE "segment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapterId" uuid NOT NULL,
	"start" integer NOT NULL,
	"end" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "track" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"order" integer DEFAULT nextval('track_order_seq') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audioAsset" ADD CONSTRAINT "audioAsset_chapterId_chapter_id_fk" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audioMapping" ADD CONSTRAINT "audioMapping_segmentId_segment_id_fk" FOREIGN KEY ("segmentId") REFERENCES "segment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audioMapping" ADD CONSTRAINT "audioMapping_audioAssetId_audioAsset_id_fk" FOREIGN KEY ("audioAssetId") REFERENCES "audioAsset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch" ADD CONSTRAINT "batch_trackId_track_id_fk" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter" ADD CONSTRAINT "chapter_trackId_track_id_fk" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_batchId_batch_id_fk" FOREIGN KEY ("batchId") REFERENCES "batch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation" ADD CONSTRAINT "evaluation_chapterId_chapter_id_fk" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam" ADD CONSTRAINT "exam_batchId_batch_id_fk" FOREIGN KEY ("batchId") REFERENCES "batch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "examResult" ADD CONSTRAINT "examResult_examId_exam_id_fk" FOREIGN KEY ("examId") REFERENCES "exam"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "examResult" ADD CONSTRAINT "examResult_chapterId_chapter_id_fk" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "examResult" ADD CONSTRAINT "examResult_evaluationId_evaluation_id_fk" FOREIGN KEY ("evaluationId") REFERENCES "evaluation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment" ADD CONSTRAINT "segment_chapterId_chapter_id_fk" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audioMapping" ADD CONSTRAINT "audioMapping_bounds_valid" CHECK ("audioStart" < "audioEnd");--> statement-breakpoint
ALTER TABLE "audioMapping" ADD CONSTRAINT "audioMapping_audioAsset_no_overlap" EXCLUDE USING gist ("audioAssetId" WITH =, numrange("audioStart"::numeric, "audioEnd"::numeric, '[)') WITH &&);--> statement-breakpoint
ALTER TABLE "segment" ADD CONSTRAINT "segment_bounds_valid" CHECK ("start" < "end");--> statement-breakpoint
ALTER TABLE "segment" ADD CONSTRAINT "segment_chapter_no_overlap" EXCLUDE USING gist ("chapterId" WITH =, int4range("start", "end", '[)') WITH &&);--> statement-breakpoint
CREATE INDEX "audioAsset_chapterId_idx" ON "audioAsset" USING btree ("chapterId");--> statement-breakpoint
CREATE UNIQUE INDEX "audioAsset_chapterId_objectKey_idx" ON "audioAsset" USING btree ("chapterId","objectKey");--> statement-breakpoint
CREATE INDEX "chapter_trackId_idx" ON "chapter" USING btree ("trackId");--> statement-breakpoint
CREATE INDEX "enrollment_batchId_idx" ON "enrollment" USING btree ("batchId");--> statement-breakpoint
CREATE INDEX "evaluation_studentId_chapterId_idx" ON "evaluation" USING btree ("studentId","chapterId");--> statement-breakpoint
CREATE INDEX "exam_batchId_idx" ON "exam" USING btree ("batchId");--> statement-breakpoint
CREATE INDEX "exam_studentId_idx" ON "exam" USING btree ("studentId");--> statement-breakpoint
CREATE INDEX "segment_chapterId_idx" ON "segment" USING btree ("chapterId");
