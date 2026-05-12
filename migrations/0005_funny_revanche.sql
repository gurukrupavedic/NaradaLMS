DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "enrollments"
    WHERE "status" = 'active'
    GROUP BY "org_id", "student_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce per-org active enrollment uniqueness while duplicate active enrollments still exist within the same org.';
  END IF;
END $$;
--> statement-breakpoint
DROP INDEX IF EXISTS "unique_active_enrollment_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "unique_active_enrollment_idx" ON "enrollments" USING btree ("org_id","student_id") WHERE status = 'active';