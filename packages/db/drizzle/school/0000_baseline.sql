-- Baseline for a school schema. Edited by hand after generation: the unique indexes that composite
-- foreign keys reference (batch, examSlot, track) come before those keys, where drizzle-kit emits
-- every index last, which Postgres refuses.
CREATE TYPE "batchStatus" AS ENUM('upcoming', 'active', 'completed');
--> statement-breakpoint
CREATE TYPE "chapterStatus" AS ENUM('draft', 'published');
--> statement-breakpoint
CREATE TYPE "enrollmentRequestStatus" AS ENUM('pending', 'approved', 'rejected');
--> statement-breakpoint
CREATE TYPE "enrollmentRole" AS ENUM('instructor', 'ta', 'student');
--> statement-breakpoint
CREATE TYPE "enrollmentStatus" AS ENUM('active', 'break', 'dropped', 'inactive');
--> statement-breakpoint
CREATE TYPE "examOutcome" AS ENUM('reappear', 'level1', 'level2', 'dwitiyaSreni', 'prathamaSreni', 'athiUttamam');
--> statement-breakpoint
CREATE TYPE "examSlotRequestStatus" AS ENUM('pending', 'approved', 'rejected');
--> statement-breakpoint
CREATE TYPE "examSlotStatus" AS ENUM('open', 'requested', 'booked', 'cancelled');
--> statement-breakpoint
CREATE TYPE "examStatus" AS ENUM('scheduled', 'inProgress', 'completed', 'cancelled');
--> statement-breakpoint
CREATE TYPE "proficiencyLevel" AS ENUM('absent', 'notStarted', 'practicing', 'level0', 'level1', 'level2', 'level3', 'level4');
--> statement-breakpoint
CREATE TYPE "registrationStatus" AS ENUM('pending', 'approved', 'rejected');
--> statement-breakpoint
CREATE TYPE "script" AS ENUM('te', 'sa', 'en');
--> statement-breakpoint
CREATE TYPE "stagedUploadPurpose" AS ENUM('audio');
--> statement-breakpoint
CREATE TYPE "stagedUploadStatus" AS ENUM('pending', 'completed', 'expired');
--> statement-breakpoint
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
CREATE TABLE "batch" (
	"id" uuid PRIMARY KEY NOT NULL,
	"trackId" uuid NOT NULL,
	"courseId" uuid NOT NULL,
	"code" text NOT NULL,
	"status" "batchStatus" DEFAULT 'upcoming' NOT NULL,
	"startDate" timestamp,
	"meetingUrl" text,
	CONSTRAINT "batch_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "batchClassSlot" (
	"id" uuid PRIMARY KEY NOT NULL,
	"batchId" uuid NOT NULL,
	"dayOfWeek" integer NOT NULL,
	"time" time NOT NULL,
	"durationMinutes" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapter" (
	"id" uuid PRIMARY KEY NOT NULL,
	"trackId" uuid NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"status" "chapterStatus" DEFAULT 'draft' NOT NULL,
	"order" integer NOT NULL,
	"script" "script",
	"archived" boolean DEFAULT false NOT NULL
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
CREATE TABLE "course" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "course_slug_unique" UNIQUE("slug"),
	CONSTRAINT "course_slug_valid" CHECK ("course"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND "course"."slug" NOT IN ('login', 'link-device', 'register', 'coming-soon', 'dashboard', 'exams', 'practice', 'admin', 'students', 'chapters', 'settings', 'v1', 'api', '_next', 'static', 'assets', 'public'))
);
--> statement-breakpoint
CREATE TABLE "courseProfile" (
	"profileId" uuid NOT NULL,
	"courseId" uuid NOT NULL,
	"learningGoal" text,
	"currentProficiency" "proficiencyLevel",
	"comments" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "courseProfile_profileId_courseId_pk" PRIMARY KEY("profileId","courseId")
);
--> statement-breakpoint
CREATE TABLE "enrollment" (
	"profileId" uuid NOT NULL,
	"batchId" uuid NOT NULL,
	"courseId" uuid NOT NULL,
	"role" "enrollmentRole" NOT NULL,
	"status" "enrollmentStatus" DEFAULT 'active' NOT NULL,
	"joinedAt" timestamp DEFAULT now(),
	"leftDate" timestamp,
	CONSTRAINT "enrollment_profileId_batchId_pk" PRIMARY KEY("profileId","batchId")
);
--> statement-breakpoint
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
CREATE TABLE "evaluation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"studentId" uuid NOT NULL,
	"chapterId" uuid NOT NULL,
	"level" "proficiencyLevel" NOT NULL,
	"notes" text,
	"evaluatorId" uuid NOT NULL,
	"evaluatedAt" timestamp DEFAULT now(),
	"batchId" uuid
);
--> statement-breakpoint
CREATE TABLE "exam" (
	"id" uuid PRIMARY KEY NOT NULL,
	"trackId" uuid NOT NULL,
	"studentId" uuid NOT NULL,
	"scheduledAt" timestamp NOT NULL,
	"status" "examStatus" DEFAULT 'scheduled' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "examResult" (
	"examId" uuid PRIMARY KEY NOT NULL,
	"aksharaShuddhi" integer NOT NULL,
	"swaraShuddhi" integer NOT NULL,
	"niyantranaAnargalata" integer NOT NULL,
	"shraavyata" integer NOT NULL,
	"pratishakyaGrammar" integer NOT NULL,
	"childrenBonus" integer NOT NULL,
	"total" integer NOT NULL,
	"outcome" "examOutcome" NOT NULL,
	"notes" text,
	"evaluatorId" uuid NOT NULL,
	"evaluatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "examResult_aksharaShuddhi_range" CHECK ("examResult"."aksharaShuddhi" BETWEEN 0 AND 50),
	CONSTRAINT "examResult_swaraShuddhi_range" CHECK ("examResult"."swaraShuddhi" BETWEEN 0 AND 30),
	CONSTRAINT "examResult_niyantranaAnargalata_range" CHECK ("examResult"."niyantranaAnargalata" BETWEEN 0 AND 20),
	CONSTRAINT "examResult_shraavyata_range" CHECK ("examResult"."shraavyata" BETWEEN 0 AND 5),
	CONSTRAINT "examResult_pratishakyaGrammar_range" CHECK ("examResult"."pratishakyaGrammar" BETWEEN 0 AND 5),
	CONSTRAINT "examResult_childrenBonus_values" CHECK ("examResult"."childrenBonus" IN (0, 5, 10)),
	CONSTRAINT "examResult_total_is_sum" CHECK ("examResult"."total" = "examResult"."aksharaShuddhi" + "examResult"."swaraShuddhi" + "examResult"."niyantranaAnargalata" + "examResult"."shraavyata" + "examResult"."pratishakyaGrammar" + "examResult"."childrenBonus")
);
--> statement-breakpoint
CREATE TABLE "examSlot" (
	"id" uuid PRIMARY KEY NOT NULL,
	"trackId" uuid NOT NULL,
	"scheduledAt" timestamp NOT NULL,
	"status" "examSlotStatus" DEFAULT 'open' NOT NULL,
	"openedBy" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "profile" (
	"id" uuid PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"yearOfBirth" integer,
	"email" text,
	"city" text,
	"state" text,
	"country" text,
	"countryTimeZone" text,
	"spokenLanguages" text[] DEFAULT '{}' NOT NULL,
	"readLanguages" text[] DEFAULT '{}' NOT NULL,
	"parentNames" text[] DEFAULT '{}' NOT NULL,
	"dressCodeAgreed" boolean DEFAULT false NOT NULL,
	"noMeatAgreed" boolean DEFAULT false NOT NULL,
	"noAlcoholAgreed" boolean DEFAULT false NOT NULL,
	"noSmokingAgreed" boolean DEFAULT false NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"deletedAt" timestamp,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration" (
	"id" uuid PRIMARY KEY NOT NULL,
	"status" "registrationStatus" DEFAULT 'pending' NOT NULL,
	"courseId" uuid NOT NULL,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"yearOfBirth" integer NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"city" text,
	"state" text,
	"country" text,
	"countryTimeZone" text,
	"spokenLanguages" text[] DEFAULT '{}' NOT NULL,
	"readLanguages" text[] DEFAULT '{}' NOT NULL,
	"parentNames" text[] DEFAULT '{}' NOT NULL,
	"dressCodeAgreed" boolean DEFAULT false NOT NULL,
	"noMeatAgreed" boolean DEFAULT false NOT NULL,
	"noAlcoholAgreed" boolean DEFAULT false NOT NULL,
	"noSmokingAgreed" boolean DEFAULT false NOT NULL,
	"learningGoal" text,
	"currentProficiency" "proficiencyLevel",
	"comments" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reviewedAt" timestamp,
	"reviewedBy" uuid,
	"convertedProfileId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segment" (
	"id" uuid PRIMARY KEY NOT NULL,
	"chapterId" uuid NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stagedUpload" (
	"id" uuid PRIMARY KEY NOT NULL,
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
CREATE TABLE "track" (
	"id" uuid PRIMARY KEY NOT NULL,
	"courseId" uuid NOT NULL,
	"name" text NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "batch_id_courseId_uidx" ON "batch" USING btree ("id","courseId");
--> statement-breakpoint
CREATE UNIQUE INDEX "examSlot_id_trackId_uidx" ON "examSlot" USING btree ("id","trackId");
--> statement-breakpoint
CREATE UNIQUE INDEX "track_id_courseId_uidx" ON "track" USING btree ("id","courseId");
--> statement-breakpoint
ALTER TABLE "audioAsset" ADD CONSTRAINT "audioAsset_chapterId_chapter_id_fk" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audioMapping" ADD CONSTRAINT "audioMapping_segmentId_segment_id_fk" FOREIGN KEY ("segmentId") REFERENCES "segment"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audioMapping" ADD CONSTRAINT "audioMapping_audioAssetId_audioAsset_id_fk" FOREIGN KEY ("audioAssetId") REFERENCES "audioAsset"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "batch" ADD CONSTRAINT "batch_trackId_track_id_fk" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "batch" ADD CONSTRAINT "batch_trackId_courseId_fk" FOREIGN KEY ("trackId","courseId") REFERENCES "track"("id","courseId") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "batchClassSlot" ADD CONSTRAINT "batchClassSlot_batchId_batch_id_fk" FOREIGN KEY ("batchId") REFERENCES "batch"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chapter" ADD CONSTRAINT "chapter_trackId_track_id_fk" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chapterScript" ADD CONSTRAINT "chapterScript_chapterId_chapter_id_fk" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chapterScriptSegment" ADD CONSTRAINT "chapterScriptSegment_chapterScriptId_chapterScript_id_fk" FOREIGN KEY ("chapterScriptId") REFERENCES "chapterScript"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chapterScriptSegment" ADD CONSTRAINT "chapterScriptSegment_segmentId_segment_id_fk" FOREIGN KEY ("segmentId") REFERENCES "segment"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "courseProfile" ADD CONSTRAINT "courseProfile_profileId_profile_id_fk" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "courseProfile" ADD CONSTRAINT "courseProfile_courseId_course_id_fk" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_profileId_profile_id_fk" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_batchId_batch_id_fk" FOREIGN KEY ("batchId") REFERENCES "batch"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_batchId_courseId_fk" FOREIGN KEY ("batchId","courseId") REFERENCES "batch"("id","courseId") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "enrollmentRequest" ADD CONSTRAINT "enrollmentRequest_profileId_profile_id_fk" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "enrollmentRequest" ADD CONSTRAINT "enrollmentRequest_batchId_batch_id_fk" FOREIGN KEY ("batchId") REFERENCES "batch"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "enrollmentRequest" ADD CONSTRAINT "enrollmentRequest_reviewedBy_profile_id_fk" FOREIGN KEY ("reviewedBy") REFERENCES "profile"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "evaluation" ADD CONSTRAINT "evaluation_studentId_profile_id_fk" FOREIGN KEY ("studentId") REFERENCES "profile"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "evaluation" ADD CONSTRAINT "evaluation_chapterId_chapter_id_fk" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "evaluation" ADD CONSTRAINT "evaluation_evaluatorId_profile_id_fk" FOREIGN KEY ("evaluatorId") REFERENCES "profile"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "evaluation" ADD CONSTRAINT "evaluation_batchId_batch_id_fk" FOREIGN KEY ("batchId") REFERENCES "batch"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "exam" ADD CONSTRAINT "exam_trackId_track_id_fk" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "exam" ADD CONSTRAINT "exam_studentId_profile_id_fk" FOREIGN KEY ("studentId") REFERENCES "profile"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "examResult" ADD CONSTRAINT "examResult_examId_exam_id_fk" FOREIGN KEY ("examId") REFERENCES "exam"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "examResult" ADD CONSTRAINT "examResult_evaluatorId_profile_id_fk" FOREIGN KEY ("evaluatorId") REFERENCES "profile"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "examSlot" ADD CONSTRAINT "examSlot_trackId_track_id_fk" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "examSlot" ADD CONSTRAINT "examSlot_openedBy_profile_id_fk" FOREIGN KEY ("openedBy") REFERENCES "profile"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "examSlotRequest" ADD CONSTRAINT "examSlotRequest_slotId_examSlot_id_fk" FOREIGN KEY ("slotId") REFERENCES "examSlot"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "examSlotRequest" ADD CONSTRAINT "examSlotRequest_studentId_profile_id_fk" FOREIGN KEY ("studentId") REFERENCES "profile"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "examSlotRequest" ADD CONSTRAINT "examSlotRequest_reviewedBy_profile_id_fk" FOREIGN KEY ("reviewedBy") REFERENCES "profile"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "examSlotRequest" ADD CONSTRAINT "examSlotRequest_examId_exam_id_fk" FOREIGN KEY ("examId") REFERENCES "exam"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "examSlotRequest" ADD CONSTRAINT "examSlotRequest_slotId_trackId_fk" FOREIGN KEY ("slotId","trackId") REFERENCES "examSlot"("id","trackId") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "registration" ADD CONSTRAINT "registration_courseId_course_id_fk" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "registration" ADD CONSTRAINT "registration_reviewedBy_profile_id_fk" FOREIGN KEY ("reviewedBy") REFERENCES "profile"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "registration" ADD CONSTRAINT "registration_convertedProfileId_profile_id_fk" FOREIGN KEY ("convertedProfileId") REFERENCES "profile"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "segment" ADD CONSTRAINT "segment_chapterId_chapter_id_fk" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stagedUpload" ADD CONSTRAINT "stagedUpload_chapterId_chapter_id_fk" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "track" ADD CONSTRAINT "track_courseId_course_id_fk" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "audioAsset_chapterId_idx" ON "audioAsset" USING btree ("chapterId");
--> statement-breakpoint
CREATE UNIQUE INDEX "audioAsset_chapterId_objectKey_uidx" ON "audioAsset" USING btree ("chapterId","objectKey");
--> statement-breakpoint
CREATE INDEX "batch_courseId_idx" ON "batch" USING btree ("courseId");
--> statement-breakpoint
CREATE INDEX "batchClassSlot_batchId_idx" ON "batchClassSlot" USING btree ("batchId");
--> statement-breakpoint
CREATE UNIQUE INDEX "batchClassSlot_batchId_dayOfWeek_uidx" ON "batchClassSlot" USING btree ("batchId","dayOfWeek");
--> statement-breakpoint
CREATE INDEX "chapter_trackId_idx" ON "chapter" USING btree ("trackId");
--> statement-breakpoint
CREATE UNIQUE INDEX "chapter_trackId_code_uidx" ON "chapter" USING btree ("trackId","code");
--> statement-breakpoint
CREATE UNIQUE INDEX "chapter_trackId_order_uidx" ON "chapter" USING btree ("trackId","order");
--> statement-breakpoint
CREATE INDEX "chapterScript_chapterId_idx" ON "chapterScript" USING btree ("chapterId");
--> statement-breakpoint
CREATE UNIQUE INDEX "chapterScript_chapterId_script_uidx" ON "chapterScript" USING btree ("chapterId","script");
--> statement-breakpoint
CREATE INDEX "enrollment_batchId_idx" ON "enrollment" USING btree ("batchId");
--> statement-breakpoint
CREATE UNIQUE INDEX "enrollment_one_active_student_seat_per_course" ON "enrollment" USING btree ("profileId","courseId") WHERE "enrollment"."role" = 'student' AND "enrollment"."status" = 'active';
--> statement-breakpoint
CREATE INDEX "enrollmentRequest_status_createdAt_idx" ON "enrollmentRequest" USING btree ("status","createdAt");
--> statement-breakpoint
CREATE INDEX "enrollmentRequest_batchId_idx" ON "enrollmentRequest" USING btree ("batchId");
--> statement-breakpoint
CREATE INDEX "evaluation_studentId_chapterId_idx" ON "evaluation" USING btree ("studentId","chapterId");
--> statement-breakpoint
CREATE INDEX "evaluation_batchId_studentId_idx" ON "evaluation" USING btree ("batchId","studentId");
--> statement-breakpoint
CREATE INDEX "exam_trackId_idx" ON "exam" USING btree ("trackId");
--> statement-breakpoint
CREATE INDEX "exam_studentId_idx" ON "exam" USING btree ("studentId");
--> statement-breakpoint
CREATE INDEX "examResult_evaluatorId_idx" ON "examResult" USING btree ("evaluatorId");
--> statement-breakpoint
CREATE INDEX "examSlot_trackId_status_scheduledAt_idx" ON "examSlot" USING btree ("trackId","status","scheduledAt");
--> statement-breakpoint
CREATE INDEX "examSlotRequest_studentId_idx" ON "examSlotRequest" USING btree ("studentId");
--> statement-breakpoint
CREATE INDEX "examSlotRequest_status_createdAt_idx" ON "examSlotRequest" USING btree ("status","createdAt");
--> statement-breakpoint
CREATE UNIQUE INDEX "examSlotRequest_one_pending_per_slot_uidx" ON "examSlotRequest" USING btree ("slotId") WHERE "examSlotRequest"."status" = 'pending';
--> statement-breakpoint
CREATE UNIQUE INDEX "examSlotRequest_one_pending_per_student_track_uidx" ON "examSlotRequest" USING btree ("studentId","trackId") WHERE "examSlotRequest"."status" = 'pending';
--> statement-breakpoint
CREATE INDEX "profile_userId_idx" ON "profile" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX "registration_status_createdAt_idx" ON "registration" USING btree ("status","createdAt");
--> statement-breakpoint
CREATE INDEX "registration_phone_idx" ON "registration" USING btree ("phone");
--> statement-breakpoint
CREATE INDEX "segment_chapterId_idx" ON "segment" USING btree ("chapterId");
--> statement-breakpoint
CREATE UNIQUE INDEX "segment_chapterId_order_uidx" ON "segment" USING btree ("chapterId","order");
--> statement-breakpoint
CREATE INDEX "stagedUpload_chapterId_idx" ON "stagedUpload" USING btree ("chapterId");
--> statement-breakpoint
CREATE INDEX "stagedUpload_status_expiresAt_idx" ON "stagedUpload" USING btree ("status","expiresAt");
--> statement-breakpoint
CREATE UNIQUE INDEX "track_courseId_order_uidx" ON "track" USING btree ("courseId","order");
