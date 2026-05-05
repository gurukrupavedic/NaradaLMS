-- Bundle C: constraint hardening with pre-migration cleanup
-- Idempotent constraint adds via pg_constraint checks; safe to re-run after COMMIT.

BEGIN;

-- =============================================================================
-- Phase A: cleanup (RAISE NOTICE for audit trail)
-- =============================================================================

DO $$ BEGIN RAISE NOTICE 'Phase A: coerce users.status to allowed set'; END $$;

UPDATE users
SET status = CASE
  WHEN status IN ('pending_approval', 'active', 'inactive') THEN status
  ELSE 'pending_approval'
END;

DO $$ BEGIN RAISE NOTICE 'Phase A: coerce users.provider to allowed set'; END $$;

UPDATE users
SET provider = CASE
  WHEN provider IN ('local', 'google') THEN provider
  ELSE 'local'
END;

DO $$ BEGIN RAISE NOTICE 'Phase A: null orphan users.invited_by / users.approved_by'; END $$;

UPDATE users u
SET invited_by = NULL
WHERE u.invited_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM users u2 WHERE u2.id = u.invited_by);

UPDATE users u
SET approved_by = NULL
WHERE u.approved_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM users u2 WHERE u2.id = u.approved_by);

DO $$ BEGIN RAISE NOTICE 'Phase A: rename duplicate chapters (track_id, title)'; END $$;

UPDATE chapters c
SET title = c.title || ' [dedup-id-' || c.id::text || ']'
FROM (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY track_id, title ORDER BY id) AS rn
  FROM chapters
) d
WHERE c.id = d.id AND d.rn > 1;

DO $$ BEGIN RAISE NOTICE 'Phase A: coerce chapters.status'; END $$;

UPDATE chapters
SET status = 'draft'
WHERE status IS NULL OR trim(status) NOT IN ('draft', 'published');

DO $$ BEGIN RAISE NOTICE 'Phase A: swap text_segments start/end when inverted'; END $$;

UPDATE text_segments
SET start_position = end_position,
    end_position = start_position
WHERE start_position > end_position;

DO $$ BEGIN RAISE NOTICE 'Phase A: dedupe segment_mappings'; END $$;

DELETE FROM segment_mappings a
USING segment_mappings b
WHERE a.media_segment_id = b.media_segment_id
  AND a.text_segment_id = b.text_segment_id
  AND a.id > b.id;

DO $$ BEGIN RAISE NOTICE 'Phase A: dedupe batches.batch_code (suffix by id)'; END $$;

UPDATE batches b
SET batch_code = b.batch_code || '-' || b.id::text
FROM (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY batch_code ORDER BY id) AS rn
  FROM batches
) d
WHERE b.id = d.id AND d.rn > 1;

DO $$ BEGIN RAISE NOTICE 'Phase A: coerce enrollments.status'; END $$;

UPDATE enrollments
SET status = 'active'
WHERE status IS NULL OR trim(status) = '';

UPDATE enrollments
SET status = 'dropped'
WHERE trim(status) NOT IN ('active', 'dropped', 'completed');

DO $$ BEGIN RAISE NOTICE 'Phase A: dedupe batch_co_instructors'; END $$;

DELETE FROM batch_co_instructors a
USING batch_co_instructors b
WHERE a.batch_id = b.batch_id
  AND a.instructor_id = b.instructor_id
  AND a.id > b.id;

DO $$ BEGIN RAISE NOTICE 'Phase A: coerce student_progress.proficiency_level'; END $$;

UPDATE student_progress
SET proficiency_level = 9
WHERE proficiency_level IS NULL OR proficiency_level NOT IN (0, 1, 2, 3, 4, 8, 9);

DO $$ BEGIN RAISE NOTICE 'Phase A: coerce proficiency_evaluation_log levels (NULL old preserved)'; END $$;

UPDATE proficiency_evaluation_log
SET old_proficiency_level = NULL
WHERE old_proficiency_level IS NOT NULL
  AND old_proficiency_level NOT IN (0, 1, 2, 3, 4, 8, 9);

UPDATE proficiency_evaluation_log
SET new_proficiency_level = 9
WHERE new_proficiency_level NOT IN (0, 1, 2, 3, 4, 8, 9);

-- =============================================================================
-- Phase B: constraints (idempotent)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_status_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_status_check
      CHECK (status IN ('pending_approval', 'active', 'inactive'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_provider_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_provider_check
      CHECK (provider IN ('local', 'google'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_invited_by_fkey') THEN
    ALTER TABLE users
      ADD CONSTRAINT users_invited_by_fkey
      FOREIGN KEY (invited_by) REFERENCES users (id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_approved_by_fkey') THEN
    ALTER TABLE users
      ADD CONSTRAINT users_approved_by_fkey
      FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chapters_track_title_uniq') THEN
    ALTER TABLE chapters ADD CONSTRAINT chapters_track_title_uniq UNIQUE (track_id, title);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chapters_status_check') THEN
    ALTER TABLE chapters ADD CONSTRAINT chapters_status_check
      CHECK (status IN ('draft', 'published'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'text_segments_start_lte_end_check') THEN
    ALTER TABLE text_segments ADD CONSTRAINT text_segments_start_lte_end_check
      CHECK (start_position <= end_position);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'segment_mappings_media_text_uniq') THEN
    ALTER TABLE segment_mappings ADD CONSTRAINT segment_mappings_media_text_uniq
      UNIQUE (media_segment_id, text_segment_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'batches_batch_code_uniq') THEN
    ALTER TABLE batches ADD CONSTRAINT batches_batch_code_uniq UNIQUE (batch_code);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'enrollments_status_check') THEN
    ALTER TABLE enrollments ADD CONSTRAINT enrollments_status_check
      CHECK (status IN ('active', 'dropped', 'completed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'batch_co_instructors_batch_instructor_uniq') THEN
    ALTER TABLE batch_co_instructors ADD CONSTRAINT batch_co_instructors_batch_instructor_uniq
      UNIQUE (batch_id, instructor_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_progress_student_chapter_unique') THEN
    ALTER TABLE student_progress ADD CONSTRAINT student_progress_student_chapter_unique
      UNIQUE (student_id, chapter_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_progress_proficiency_level_check') THEN
    ALTER TABLE student_progress ADD CONSTRAINT student_progress_proficiency_level_check
      CHECK (proficiency_level IN (0, 1, 2, 3, 4, 8, 9));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proficiency_eval_log_new_level_check') THEN
    ALTER TABLE proficiency_evaluation_log ADD CONSTRAINT proficiency_eval_log_new_level_check
      CHECK (new_proficiency_level IN (0, 1, 2, 3, 4, 8, 9));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proficiency_eval_log_old_level_check') THEN
    ALTER TABLE proficiency_evaluation_log ADD CONSTRAINT proficiency_eval_log_old_level_check
      CHECK (old_proficiency_level IS NULL OR old_proficiency_level IN (0, 1, 2, 3, 4, 8, 9));
  END IF;
END $$;

COMMIT;
