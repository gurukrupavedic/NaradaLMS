ALTER TABLE "audio_files" ADD COLUMN "org_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "org_id" uuid;--> statement-breakpoint
ALTER TABLE "media_segments" ADD COLUMN "org_id" uuid;--> statement-breakpoint
ALTER TABLE "proficiency_evaluation_log" ADD COLUMN "org_id" uuid;--> statement-breakpoint
ALTER TABLE "segment_mappings" ADD COLUMN "org_id" uuid;--> statement-breakpoint
ALTER TABLE "student_progress" ADD COLUMN "org_id" uuid;--> statement-breakpoint
ALTER TABLE "text_segments" ADD COLUMN "org_id" uuid;--> statement-breakpoint
DO $$
DECLARE
  mismatch_count integer;
  unresolved_count integer;
BEGIN
  UPDATE audio_files
  SET org_id = chapters.org_id
  FROM chapters
  WHERE audio_files.chapter_id = chapters.id
    AND audio_files.org_id IS NULL;

  UPDATE text_segments
  SET org_id = chapters.org_id
  FROM chapters
  WHERE text_segments.chapter_id = chapters.id
    AND text_segments.org_id IS NULL;

  UPDATE media_segments
  SET org_id = audio_files.org_id
  FROM audio_files
  WHERE media_segments.audio_file_id = audio_files.id
    AND media_segments.org_id IS NULL;

  SELECT count(*)::int
  INTO mismatch_count
  FROM segment_mappings
  INNER JOIN media_segments ON segment_mappings.media_segment_id = media_segments.id
  INNER JOIN text_segments ON segment_mappings.text_segment_id = text_segments.id
  WHERE media_segments.org_id IS NOT NULL
    AND text_segments.org_id IS NOT NULL
    AND media_segments.org_id <> text_segments.org_id;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'Cannot backfill segment_mappings.org_id when media/text segment orgs disagree';
  END IF;

  UPDATE segment_mappings
  SET org_id = media_segments.org_id
  FROM media_segments, text_segments
  WHERE segment_mappings.media_segment_id = media_segments.id
    AND segment_mappings.text_segment_id = text_segments.id
    AND media_segments.org_id = text_segments.org_id
    AND segment_mappings.org_id IS NULL;

  SELECT count(*)::int
  INTO mismatch_count
  FROM student_progress
  INNER JOIN chapters ON student_progress.chapter_id = chapters.id
  LEFT JOIN batches ON student_progress.batch_id = batches.id
  WHERE batches.id IS NOT NULL
    AND chapters.org_id <> batches.org_id;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'Cannot backfill student_progress.org_id when chapter and batch orgs disagree';
  END IF;

  UPDATE student_progress
  SET org_id = chapters.org_id
  FROM chapters
  WHERE student_progress.chapter_id = chapters.id
    AND student_progress.org_id IS NULL;

  SELECT count(*)::int
  INTO mismatch_count
  FROM proficiency_evaluation_log
  INNER JOIN chapters ON proficiency_evaluation_log.chapter_id = chapters.id
  LEFT JOIN batches ON proficiency_evaluation_log.batch_id = batches.id
  WHERE batches.id IS NOT NULL
    AND chapters.org_id <> batches.org_id;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'Cannot backfill proficiency_evaluation_log.org_id when chapter and batch orgs disagree';
  END IF;

  UPDATE proficiency_evaluation_log
  SET org_id = chapters.org_id
  FROM chapters
  WHERE proficiency_evaluation_log.chapter_id = chapters.id
    AND proficiency_evaluation_log.org_id IS NULL;

  UPDATE audit_logs
  SET org_id = organizations.id
  FROM organizations
  WHERE audit_logs.org_id IS NULL
    AND jsonb_typeof(audit_logs.changes) = 'object'
    AND audit_logs.changes ? 'orgId'
    AND organizations.id::text = audit_logs.changes->>'orgId';

  SELECT count(*)::int INTO unresolved_count FROM audio_files WHERE org_id IS NULL;
  IF unresolved_count > 0 THEN
    RAISE EXCEPTION 'audio_files.org_id backfill left % unresolved rows', unresolved_count;
  END IF;

  SELECT count(*)::int INTO unresolved_count FROM text_segments WHERE org_id IS NULL;
  IF unresolved_count > 0 THEN
    RAISE EXCEPTION 'text_segments.org_id backfill left % unresolved rows', unresolved_count;
  END IF;

  SELECT count(*)::int INTO unresolved_count FROM media_segments WHERE org_id IS NULL;
  IF unresolved_count > 0 THEN
    RAISE EXCEPTION 'media_segments.org_id backfill left % unresolved rows', unresolved_count;
  END IF;

  SELECT count(*)::int INTO unresolved_count FROM segment_mappings WHERE org_id IS NULL;
  IF unresolved_count > 0 THEN
    RAISE EXCEPTION 'segment_mappings.org_id backfill left % unresolved rows', unresolved_count;
  END IF;

  SELECT count(*)::int INTO unresolved_count FROM student_progress WHERE org_id IS NULL;
  IF unresolved_count > 0 THEN
    RAISE EXCEPTION 'student_progress.org_id backfill left % unresolved rows', unresolved_count;
  END IF;

  SELECT count(*)::int INTO unresolved_count FROM proficiency_evaluation_log WHERE org_id IS NULL;
  IF unresolved_count > 0 THEN
    RAISE EXCEPTION 'proficiency_evaluation_log.org_id backfill left % unresolved rows', unresolved_count;
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "audio_files" ALTER COLUMN "org_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "media_segments" ALTER COLUMN "org_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "proficiency_evaluation_log" ALTER COLUMN "org_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "segment_mappings" ALTER COLUMN "org_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "student_progress" ALTER COLUMN "org_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "text_segments" ALTER COLUMN "org_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "audio_files" ADD CONSTRAINT "audio_files_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_segments" ADD CONSTRAINT "media_segments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proficiency_evaluation_log" ADD CONSTRAINT "proficiency_evaluation_log_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment_mappings" ADD CONSTRAINT "segment_mappings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "text_segments" ADD CONSTRAINT "text_segments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audio_files_org" ON "audio_files" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_org_timestamp_desc" ON "audit_logs" USING btree ("org_id","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_media_segments_org" ON "media_segments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_proficiency_log_org" ON "proficiency_evaluation_log" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_segment_mappings_org" ON "segment_mappings" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_progress_org" ON "student_progress" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_text_segments_org" ON "text_segments" USING btree ("org_id");