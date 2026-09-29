CREATE TABLE "docChapter" (
	"id" uuid PRIMARY KEY NOT NULL,
	"courseId" uuid NOT NULL,
	"title" text NOT NULL,
	"track" text NOT NULL,
	"sourceUploadId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "docChapterUpload" (
	"id" uuid PRIMARY KEY NOT NULL,
	"courseId" uuid NOT NULL,
	"uploadedByProfileId" uuid,
	"saObjectKey" text NOT NULL,
	"teObjectKey" text NOT NULL,
	"enObjectKey" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segmentText" (
	"segmentId" uuid NOT NULL,
	"script" "script" NOT NULL,
	"text" text NOT NULL,
	CONSTRAINT "segmentText_segmentId_script_pk" PRIMARY KEY("segmentId","script"),
	CONSTRAINT "segmentText_text_nonempty" CHECK (length(trim("segmentText"."text")) > 0)
);
--> statement-breakpoint
ALTER TABLE "chapterScript" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chapterScriptSegment" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "chapterScript" CASCADE;--> statement-breakpoint
DROP TABLE "chapterScriptSegment" CASCADE;--> statement-breakpoint
DROP INDEX "segment_chapterId_order_uidx";--> statement-breakpoint
ALTER TABLE "segment" ALTER COLUMN "chapterId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "segment" ADD COLUMN "docChapterId" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "segment" ADD COLUMN "flaggedForReview" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "docChapter" ADD CONSTRAINT "docChapter_courseId_course_id_fk" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "docChapter" ADD CONSTRAINT "docChapter_sourceUploadId_docChapterUpload_id_fk" FOREIGN KEY ("sourceUploadId") REFERENCES "docChapterUpload"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "docChapterUpload" ADD CONSTRAINT "docChapterUpload_courseId_course_id_fk" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "docChapterUpload" ADD CONSTRAINT "docChapterUpload_uploadedByProfileId_profile_id_fk" FOREIGN KEY ("uploadedByProfileId") REFERENCES "profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segmentText" ADD CONSTRAINT "segmentText_segmentId_segment_id_fk" FOREIGN KEY ("segmentId") REFERENCES "segment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "docChapter_courseId_idx" ON "docChapter" USING btree ("courseId");--> statement-breakpoint
CREATE UNIQUE INDEX "docChapter_courseId_title_uidx" ON "docChapter" USING btree ("courseId","title");--> statement-breakpoint
CREATE INDEX "docChapterUpload_courseId_idx" ON "docChapterUpload" USING btree ("courseId");--> statement-breakpoint
ALTER TABLE "segment" ADD CONSTRAINT "segment_docChapterId_docChapter_id_fk" FOREIGN KEY ("docChapterId") REFERENCES "docChapter"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "segment_docChapterId_idx" ON "segment" USING btree ("docChapterId");--> statement-breakpoint
CREATE UNIQUE INDEX "segment_docChapterId_order_uidx" ON "segment" USING btree ("docChapterId","order");