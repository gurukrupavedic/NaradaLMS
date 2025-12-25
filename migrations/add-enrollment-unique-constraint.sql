-- Migration: Add one-to-many constraint for student enrollments
-- Date: 2025-12-25
-- Description: Enforce business rule that a student can only enroll in ONE batch at a time

-- Step 1: Check for existing violations (students with multiple active enrollments)
DO $$
DECLARE
    violation_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO violation_count
    FROM (
        SELECT student_id, COUNT(*) as enrollment_count
        FROM enrollments
        WHERE status = 'active'
        GROUP BY student_id
        HAVING COUNT(*) > 1
    ) violations;
    
    IF violation_count > 0 THEN
        RAISE NOTICE 'WARNING: Found % students with multiple active enrollments', violation_count;
        RAISE NOTICE 'Run this query to see details: SELECT student_id, COUNT(*) FROM enrollments WHERE status = ''active'' GROUP BY student_id HAVING COUNT(*) > 1;';
    ELSE
        RAISE NOTICE 'No violations found. Safe to proceed with unique index creation.';
    END IF;
END $$;

-- Step 2: Create partial unique index to enforce one-to-many constraint
-- This allows multiple 'dropped' or 'completed' enrollments, but only ONE 'active' enrollment per student
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_enrollment_idx 
ON enrollments(student_id) 
WHERE status = 'active';

-- Verify the index was created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE indexname = 'unique_active_enrollment_idx';
