-- Bundle G: performance indexes for audio_files and audit_logs
--
-- 13.4 DEFERRED: Do not add an index on (resource_type, resource_id) until a concrete
-- admin or API query filters by resource instance (not just resource_type + time ordering).

BEGIN;

CREATE INDEX IF NOT EXISTS idx_audio_files_chapter ON audio_files (chapter_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp_desc ON audit_logs ("timestamp" DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp_desc ON audit_logs (user_id, "timestamp" DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type_timestamp_desc ON audit_logs (resource_type, "timestamp" DESC);

COMMIT;
