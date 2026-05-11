CREATE TABLE "audio_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"filename" text NOT NULL,
	"display_name" text NOT NULL,
	"reciter" text,
	"duration" real,
	"file_size" integer,
	"mime_type" varchar,
	"uploaded_by" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"changes" jsonb,
	"timestamp" timestamp with time zone DEFAULT now(),
	"request_id" text
);
--> statement-breakpoint
CREATE TABLE "batch_co_instructors" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" integer NOT NULL,
	"instructor_id" varchar NOT NULL,
	"role" varchar DEFAULT 'co_instructor' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now(),
	"assigned_by" varchar NOT NULL,
	CONSTRAINT "batch_co_instructors_batch_instructor_uniq" UNIQUE("batch_id","instructor_id")
);
--> statement-breakpoint
CREATE TABLE "batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_code" text NOT NULL,
	"batch_name" text NOT NULL,
	"track_id" integer,
	"primary_instructor_id" varchar,
	"cohort_type" varchar(20),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_by" varchar NOT NULL,
	CONSTRAINT "batches_batch_code_uniq" UNIQUE("batch_code")
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" serial PRIMARY KEY NOT NULL,
	"track_id" integer NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer NOT NULL,
	"status" varchar DEFAULT 'draft' NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"last_edited_by" varchar,
	"created_by" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "chapters_track_title_uniq" UNIQUE("track_id","title"),
	CONSTRAINT "chapters_status_check" CHECK (status IN ('draft', 'published'))
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" integer NOT NULL,
	"student_id" varchar NOT NULL,
	"status" varchar DEFAULT 'active' NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now(),
	"enrolled_by" varchar NOT NULL,
	"dropped_at" timestamp with time zone,
	"dropped_reason" text,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "enrollments_status_check" CHECK (status IN ('active', 'dropped', 'completed'))
);
--> statement-breakpoint
CREATE TABLE "media_segments" (
	"id" serial PRIMARY KEY NOT NULL,
	"audio_file_id" integer NOT NULL,
	"start_ms" integer NOT NULL,
	"end_ms" integer NOT NULL,
	"segment_name" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "media_segments_start_ms_nonneg_check" CHECK ("media_segments"."start_ms" >= 0),
	CONSTRAINT "media_segments_end_ms_nonneg_check" CHECK ("media_segments"."end_ms" >= 0),
	CONSTRAINT "media_segments_start_lt_end_check" CHECK ("media_segments"."start_ms" < "media_segments"."end_ms")
);
--> statement-breakpoint
CREATE TABLE "proficiency_evaluation_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" varchar NOT NULL,
	"chapter_id" integer NOT NULL,
	"batch_id" integer,
	"instructor_id" varchar NOT NULL,
	"old_proficiency_level" integer,
	"new_proficiency_level" integer NOT NULL,
	"notes" text,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proficiency_eval_log_new_level_check" CHECK (new_proficiency_level IN (0, 1, 2, 3, 4, 8, 9)),
	CONSTRAINT "proficiency_eval_log_old_level_check" CHECK ((old_proficiency_level IS NULL OR old_proficiency_level IN (0, 1, 2, 3, 4, 8, 9)))
);
--> statement-breakpoint
CREATE TABLE "segment_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"media_segment_id" integer NOT NULL,
	"text_segment_id" integer NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "segment_mappings_media_text_uniq" UNIQUE("media_segment_id","text_segment_id")
);
--> statement-breakpoint
CREATE TABLE "student_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" varchar NOT NULL,
	"chapter_id" integer NOT NULL,
	"batch_id" integer,
	"proficiency_level" integer DEFAULT 0 NOT NULL,
	"last_accessed" timestamp with time zone,
	"last_evaluated_at" timestamp with time zone,
	"evaluated_by" varchar,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "student_progress_student_chapter_unique" UNIQUE("student_id","chapter_id"),
	CONSTRAINT "student_progress_proficiency_level_check" CHECK (proficiency_level IN (0, 1, 2, 3, 4, 8, 9))
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_by" varchar,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "text_segments" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"script" varchar(2) NOT NULL,
	"start_position" integer NOT NULL,
	"end_position" integer NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "text_segments_chapter_script_order_uniq" UNIQUE("chapter_id","script","order"),
	CONSTRAINT "text_segments_start_lte_end_check" CHECK (start_position <= end_position)
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "tracks_title_unique" UNIQUE("title")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"password_hash" varchar,
	"provider" varchar DEFAULT 'local' NOT NULL,
	"provider_id" varchar,
	"roles" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"status" varchar DEFAULT 'pending_approval' NOT NULL,
	"invited_by" varchar,
	"invited_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"approved_by" varchar,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_status_check" CHECK (status IN ('pending_approval', 'active', 'inactive')),
	CONSTRAINT "users_provider_check" CHECK (provider IN ('local', 'google'))
);
--> statement-breakpoint
ALTER TABLE "audio_files" ADD CONSTRAINT "audio_files_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_files" ADD CONSTRAINT "audio_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_co_instructors" ADD CONSTRAINT "batch_co_instructors_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_co_instructors" ADD CONSTRAINT "batch_co_instructors_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_co_instructors" ADD CONSTRAINT "batch_co_instructors_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_primary_instructor_id_users_id_fk" FOREIGN KEY ("primary_instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_last_edited_by_users_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_enrolled_by_users_id_fk" FOREIGN KEY ("enrolled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_segments" ADD CONSTRAINT "media_segments_audio_file_id_audio_files_id_fk" FOREIGN KEY ("audio_file_id") REFERENCES "public"."audio_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_segments" ADD CONSTRAINT "media_segments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proficiency_evaluation_log" ADD CONSTRAINT "proficiency_evaluation_log_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proficiency_evaluation_log" ADD CONSTRAINT "proficiency_evaluation_log_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proficiency_evaluation_log" ADD CONSTRAINT "proficiency_evaluation_log_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proficiency_evaluation_log" ADD CONSTRAINT "proficiency_evaluation_log_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment_mappings" ADD CONSTRAINT "segment_mappings_media_segment_id_media_segments_id_fk" FOREIGN KEY ("media_segment_id") REFERENCES "public"."media_segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment_mappings" ADD CONSTRAINT "segment_mappings_text_segment_id_text_segments_id_fk" FOREIGN KEY ("text_segment_id") REFERENCES "public"."text_segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment_mappings" ADD CONSTRAINT "segment_mappings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_evaluated_by_users_id_fk" FOREIGN KEY ("evaluated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "text_segments" ADD CONSTRAINT "text_segments_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "text_segments" ADD CONSTRAINT "text_segments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audio_files_chapter" ON "audio_files" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_timestamp_desc" ON "audit_logs" USING btree ("timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user_timestamp_desc" ON "audit_logs" USING btree ("user_id","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_audit_logs_resource_type_timestamp_desc" ON "audit_logs" USING btree ("resource_type","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_co_instructors_batch" ON "batch_co_instructors" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "idx_co_instructors_instructor" ON "batch_co_instructors" USING btree ("instructor_id");--> statement-breakpoint
CREATE INDEX "idx_chapters_track" ON "chapters" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "unique_active_enrollment_idx" ON "enrollments" USING btree ("student_id") WHERE status = 'active';--> statement-breakpoint
CREATE INDEX "idx_enrollments_batch" ON "enrollments" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "idx_proficiency_log_student" ON "proficiency_evaluation_log" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_proficiency_log_chapter" ON "proficiency_evaluation_log" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "idx_proficiency_log_batch" ON "proficiency_evaluation_log" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "idx_progress_student" ON "student_progress" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_progress_chapter" ON "student_progress" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "idx_progress_batch" ON "student_progress" USING btree ("batch_id");