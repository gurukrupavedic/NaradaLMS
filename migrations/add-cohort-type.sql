-- Add cohortType column to batches table
ALTER TABLE batches ADD COLUMN IF NOT EXISTS cohort_type VARCHAR(20);

-- Add comment explaining the field
COMMENT ON COLUMN batches.cohort_type IS 'Student cohort type: brahmacharya (celibate students) or grihastha (householder students)';
