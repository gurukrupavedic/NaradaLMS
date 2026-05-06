-- Bundle F: normalize application timestamps to timestamptz
-- Interprets existing timestamp-without-time-zone values as UTC wall times
-- (USING col AT TIME ZONE 'UTC') for a stable UTC-safe roundtrip.
-- Apply after prior bundle migrations; not idempotent on type (re-run is a no-op only if already timestamptz).

BEGIN;

ALTER TABLE users
  ALTER COLUMN invited_at TYPE timestamptz USING invited_at AT TIME ZONE 'UTC',
  ALTER COLUMN approved_at TYPE timestamptz USING approved_at AT TIME ZONE 'UTC',
  ALTER COLUMN last_login_at TYPE timestamptz USING last_login_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE tracks
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE chapters
  ALTER COLUMN published_at TYPE timestamptz USING published_at AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_at TYPE timestamptz USING deleted_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE audio_files
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE text_segments
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE media_segments
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE segment_mappings
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE batches
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE enrollments
  ALTER COLUMN enrolled_at TYPE timestamptz USING enrolled_at AT TIME ZONE 'UTC',
  ALTER COLUMN dropped_at TYPE timestamptz USING dropped_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE batch_co_instructors
  ALTER COLUMN assigned_at TYPE timestamptz USING assigned_at AT TIME ZONE 'UTC';

ALTER TABLE student_progress
  ALTER COLUMN last_accessed TYPE timestamptz USING last_accessed AT TIME ZONE 'UTC',
  ALTER COLUMN last_evaluated_at TYPE timestamptz USING last_evaluated_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE proficiency_evaluation_log
  ALTER COLUMN evaluated_at TYPE timestamptz USING evaluated_at AT TIME ZONE 'UTC';

ALTER TABLE audit_logs
  ALTER COLUMN "timestamp" TYPE timestamptz USING "timestamp" AT TIME ZONE 'UTC';

ALTER TABLE system_settings
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

COMMIT;
