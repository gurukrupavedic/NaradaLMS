-- Migration: Fix Proficiency Level Duplicates and Add Audit Logging
-- Date: 2026-01-08
-- Description: Removes duplicate proficiency records, adds unique constraint, 
--              and creates audit log table for proficiency evaluations

-- ============================================================================
-- STEP 1: Clean up existing duplicate records
-- ============================================================================
-- Strategy: Keep the most recently evaluated record, delete older duplicates

DO $$
BEGIN
  RAISE NOTICE 'Step 1: Identifying and removing duplicate proficiency records...';
  
  -- Delete duplicates, keeping the most recent evaluation
  DELETE FROM student_progress
  WHERE id IN (
    SELECT sp.id
    FROM student_progress sp
    INNER JOIN (
      SELECT 
        student_id,
        chapter_id,
        MAX(last_evaluated_at) as latest_eval
      FROM student_progress
      GROUP BY student_id, chapter_id
      HAVING COUNT(*) > 1
    ) dups
    ON sp.student_id = dups.student_id
    AND sp.chapter_id = dups.chapter_id
    AND sp.last_evaluated_at < dups.latest_eval
  );
  
  RAISE NOTICE 'Duplicate records removed.';
END $$;

-- ============================================================================
-- STEP 2: Add unique constraint to prevent future duplicates
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Step 2: Adding unique constraint on (student_id, chapter_id)...';
  
  -- Add unique constraint
  ALTER TABLE student_progress 
  ADD CONSTRAINT student_progress_student_chapter_unique 
  UNIQUE (student_id, chapter_id);
  
  RAISE NOTICE 'Unique constraint added successfully.';
END $$;

-- ============================================================================
-- STEP 3: Set batchId to null for all existing records (proficiency is batch-agnostic)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Step 3: Setting batchId to null for all proficiency records...';
  
  UPDATE student_progress
  SET batch_id = NULL
  WHERE batch_id IS NOT NULL;
  
  RAISE NOTICE 'BatchId nullified for all records.';
END $$;

-- ============================================================================
-- STEP 4: Create proficiency evaluation audit log table
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Step 4: Creating proficiency_evaluation_log table...';
  
  CREATE TABLE IF NOT EXISTS proficiency_evaluation_log (
    id SERIAL PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES users(id),
    chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    batch_id INTEGER REFERENCES batches(id),
    instructor_id TEXT NOT NULL REFERENCES users(id),
    old_proficiency_level INTEGER,
    new_proficiency_level INTEGER NOT NULL,
    notes TEXT,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
  );
  
  -- Create indexes for better query performance
  CREATE INDEX IF NOT EXISTS idx_proficiency_log_student ON proficiency_evaluation_log(student_id);
  CREATE INDEX IF NOT EXISTS idx_proficiency_log_chapter ON proficiency_evaluation_log(chapter_id);
  CREATE INDEX IF NOT EXISTS idx_proficiency_log_batch ON proficiency_evaluation_log(batch_id);
  
  RAISE NOTICE 'Audit log table and indexes created successfully.';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '=================================================================';
END $$;

-- ============================================================================
-- STEP 5: Verification queries (commented out - run manually if needed)
-- ============================================================================

-- -- Verify no duplicates remain
-- SELECT 
--   student_id,
--   chapter_id,
--   COUNT(*) as record_count
-- FROM student_progress
-- GROUP BY student_id, chapter_id
-- HAVING COUNT(*) > 1;
-- -- Expected: No rows

-- -- Verify all batchId values are null
-- SELECT COUNT(*) FROM student_progress WHERE batch_id IS NOT NULL;
-- -- Expected: 0

-- -- Verify audit log table exists
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name = 'proficiency_evaluation_log';
-- -- Expected: 1 row
