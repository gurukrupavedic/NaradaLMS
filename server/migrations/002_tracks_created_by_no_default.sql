-- Bundle A (Task 2.1): remove implicit actor default from tracks.created_by.
-- All insert paths must now provide created_by explicitly.
ALTER TABLE tracks
ALTER COLUMN created_by DROP DEFAULT;
