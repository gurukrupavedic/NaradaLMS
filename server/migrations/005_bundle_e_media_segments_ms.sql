-- Bundle E: media_segments milliseconds contract
-- Replaces real-typed start_timestamp / end_timestamp (seconds) with integer start_ms / end_ms.
-- Idempotent: safe to re-run after COMMIT.

BEGIN;

-- =============================================================================
-- Phase A: cleanup of existing real-typed seconds before backfilling integer ms
-- (Auto-fix policy per Bundle E plan; mirrors Bundle C cleanup style.)
-- Guarded so this phase is a no-op once the legacy columns have been dropped.
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_segments' AND column_name = 'start_timestamp'
  ) THEN
    RAISE NOTICE 'Phase A: clamp negative media_segments.start_timestamp / end_timestamp to 0';

    UPDATE media_segments
    SET start_timestamp = 0
    WHERE start_timestamp < 0;

    UPDATE media_segments
    SET end_timestamp = 0
    WHERE end_timestamp < 0;

    RAISE NOTICE 'Phase A: swap inverted ranges (end < start)';

    UPDATE media_segments
    SET start_timestamp = LEAST(start_timestamp, end_timestamp),
        end_timestamp = GREATEST(start_timestamp, end_timestamp)
    WHERE start_timestamp > end_timestamp;

    RAISE NOTICE 'Phase A: bump zero-length ranges by 1ms (0.001s) so start_ms < end_ms holds';

    UPDATE media_segments
    SET end_timestamp = start_timestamp + 0.001
    WHERE start_timestamp = end_timestamp;
  END IF;
END $$;

-- =============================================================================
-- Phase B: schema swap (real seconds -> integer ms)
-- =============================================================================

ALTER TABLE media_segments ADD COLUMN IF NOT EXISTS start_ms integer;
ALTER TABLE media_segments ADD COLUMN IF NOT EXISTS end_ms integer;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_segments' AND column_name = 'start_timestamp'
  ) THEN
    RAISE NOTICE 'Phase B: backfill start_ms / end_ms from start_timestamp / end_timestamp';

    UPDATE media_segments
    SET start_ms = ROUND(start_timestamp * 1000)::int
    WHERE start_ms IS NULL;

    UPDATE media_segments
    SET end_ms = ROUND(end_timestamp * 1000)::int
    WHERE end_ms IS NULL;
  END IF;
END $$;

-- Defensive: any remaining NULL means the row had no legacy value either; default to 0.
UPDATE media_segments SET start_ms = 0 WHERE start_ms IS NULL;
UPDATE media_segments SET end_ms = COALESCE(end_ms, start_ms + 1) WHERE end_ms IS NULL;

-- Re-apply auto-fix on the integer columns so the constraints below are guaranteed to pass.
UPDATE media_segments SET start_ms = 0 WHERE start_ms < 0;
UPDATE media_segments SET end_ms = 0 WHERE end_ms < 0;

UPDATE media_segments
SET start_ms = LEAST(start_ms, end_ms),
    end_ms = GREATEST(start_ms, end_ms)
WHERE start_ms > end_ms;

UPDATE media_segments
SET end_ms = start_ms + 1
WHERE start_ms = end_ms;

ALTER TABLE media_segments ALTER COLUMN start_ms SET NOT NULL;
ALTER TABLE media_segments ALTER COLUMN end_ms SET NOT NULL;

ALTER TABLE media_segments DROP COLUMN IF EXISTS start_timestamp;
ALTER TABLE media_segments DROP COLUMN IF EXISTS end_timestamp;

-- =============================================================================
-- Phase C: constraints (idempotent via pg_constraint guards)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_segments_start_ms_nonneg_check') THEN
    ALTER TABLE media_segments ADD CONSTRAINT media_segments_start_ms_nonneg_check
      CHECK (start_ms >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_segments_end_ms_nonneg_check') THEN
    ALTER TABLE media_segments ADD CONSTRAINT media_segments_end_ms_nonneg_check
      CHECK (end_ms >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_segments_start_lt_end_check') THEN
    ALTER TABLE media_segments ADD CONSTRAINT media_segments_start_lt_end_check
      CHECK (start_ms < end_ms);
  END IF;
END $$;

COMMIT;
