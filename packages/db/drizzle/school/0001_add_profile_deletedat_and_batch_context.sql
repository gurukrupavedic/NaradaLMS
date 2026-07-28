ALTER TABLE "profile" ADD COLUMN "deletedAt" timestamp;--> statement-breakpoint
ALTER TABLE "exam" ADD COLUMN "batchId" uuid;--> statement-breakpoint
ALTER TABLE "evaluation" ADD COLUMN "batchId" uuid;--> statement-breakpoint
ALTER TABLE "exam" ADD CONSTRAINT "exam_batchId_batch_id_fk" FOREIGN KEY ("batchId") REFERENCES "batch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation" ADD CONSTRAINT "evaluation_batchId_batch_id_fk" FOREIGN KEY ("batchId") REFERENCES "batch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exam_batchId_studentId_idx" ON "exam" USING btree ("batchId","studentId");--> statement-breakpoint
CREATE INDEX "evaluation_batchId_studentId_idx" ON "evaluation" USING btree ("batchId","studentId");
