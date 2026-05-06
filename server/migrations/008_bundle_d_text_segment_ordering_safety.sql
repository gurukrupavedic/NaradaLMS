-- Bundle D: text segment ordering safety (task 5.2)
-- Adds deterministic cleanup + UNIQUE(chapter_id, script, "order")

BEGIN;

-- =============================================================================
-- Phase A: deterministic dedupe/renumber within each (chapter_id, script)
-- =============================================================================

DO $$ BEGIN RAISE NOTICE 'Bundle D: renumber text_segments.order per (chapter_id, script)'; END $$;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY chapter_id, script
      ORDER BY "order" ASC, id ASC
    ) - 1 AS normalized_order
  FROM text_segments
)
UPDATE text_segments ts
SET "order" = ranked.normalized_order
FROM ranked
WHERE ts.id = ranked.id
  AND ts."order" <> ranked.normalized_order;

-- =============================================================================
-- Phase B: add uniqueness constraint (idempotent)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'text_segments_chapter_script_order_uniq'
  ) THEN
    ALTER TABLE text_segments
      ADD CONSTRAINT text_segments_chapter_script_order_uniq
      UNIQUE (chapter_id, script, "order");
  END IF;
END $$;

COMMIT;
