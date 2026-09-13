CREATE TABLE "audioAsset" (
	"id" uuid PRIMARY KEY NOT NULL,
	"chapterId" uuid NOT NULL,
	"label" text,
	"reciter" text NOT NULL,
	"objectKey" text NOT NULL,
	"duration" real NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audioMapping" (
	"segmentId" uuid NOT NULL,
	"audioAssetId" uuid NOT NULL,
	"audioStart" real NOT NULL,
	"audioEnd" real NOT NULL,
	CONSTRAINT "audioMapping_segmentId_audioAssetId_pk" PRIMARY KEY("segmentId","audioAssetId"),
	CONSTRAINT "audioMapping_bounds_valid" CHECK ("audioMapping"."audioStart" < "audioMapping"."audioEnd")
);
--> statement-breakpoint
CREATE TABLE "chapterScript" (
	"id" uuid PRIMARY KEY NOT NULL,
	"chapterId" uuid NOT NULL,
	"script" "script" NOT NULL,
	"label" text NOT NULL,
	"shortLabel" text NOT NULL,
	"fontClass" text NOT NULL,
	"text" text NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapterScriptSegment" (
	"chapterScriptId" uuid NOT NULL,
	"segmentId" uuid NOT NULL,
	"start" integer NOT NULL,
	"end" integer NOT NULL,
	CONSTRAINT "chapterScriptSegment_chapterScriptId_segmentId_pk" PRIMARY KEY("chapterScriptId","segmentId"),
	CONSTRAINT "chapterScriptSegment_bounds_valid" CHECK ("chapterScriptSegment"."start" < "chapterScriptSegment"."end")
);
--> statement-breakpoint
CREATE TABLE "segment" (
	"id" uuid PRIMARY KEY NOT NULL,
	"chapterId" uuid NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audioAsset" ADD CONSTRAINT "audioAsset_chapterId_chapter_id_fk" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audioMapping" ADD CONSTRAINT "audioMapping_segmentId_segment_id_fk" FOREIGN KEY ("segmentId") REFERENCES "segment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audioMapping" ADD CONSTRAINT "audioMapping_audioAssetId_audioAsset_id_fk" FOREIGN KEY ("audioAssetId") REFERENCES "audioAsset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapterScript" ADD CONSTRAINT "chapterScript_chapterId_chapter_id_fk" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapterScriptSegment" ADD CONSTRAINT "chapterScriptSegment_chapterScriptId_chapterScript_id_fk" FOREIGN KEY ("chapterScriptId") REFERENCES "chapterScript"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapterScriptSegment" ADD CONSTRAINT "chapterScriptSegment_segmentId_segment_id_fk" FOREIGN KEY ("segmentId") REFERENCES "segment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment" ADD CONSTRAINT "segment_chapterId_chapter_id_fk" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audioAsset_chapterId_idx" ON "audioAsset" USING btree ("chapterId");--> statement-breakpoint
CREATE UNIQUE INDEX "audioAsset_chapterId_objectKey_uidx" ON "audioAsset" USING btree ("chapterId","objectKey");--> statement-breakpoint
CREATE INDEX "chapterScript_chapterId_idx" ON "chapterScript" USING btree ("chapterId");--> statement-breakpoint
CREATE UNIQUE INDEX "chapterScript_chapterId_script_uidx" ON "chapterScript" USING btree ("chapterId","script");--> statement-breakpoint
CREATE INDEX "segment_chapterId_idx" ON "segment" USING btree ("chapterId");--> statement-breakpoint
CREATE UNIQUE INDEX "segment_chapterId_order_uidx" ON "segment" USING btree ("chapterId","order");