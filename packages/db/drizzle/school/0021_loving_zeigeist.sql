ALTER TABLE "exam" DROP CONSTRAINT "exam_batchId_batch_id_fk";
--> statement-breakpoint
DROP INDEX "exam_batchId_studentId_idx";--> statement-breakpoint
ALTER TABLE "exam" DROP COLUMN "batchId";