BEGIN;

ALTER TABLE tracks RENAME COLUMN "order" TO sort_order;
ALTER TABLE chapters RENAME COLUMN "order" TO sort_order;

ALTER TABLE chapters
  ADD COLUMN IF NOT EXISTS deleted_at timestamp;

COMMIT;
