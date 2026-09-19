CREATE TYPE "examOutcome" AS ENUM('reappear', 'level1', 'level2', 'dwitiyaSreni', 'prathamaSreni', 'athiUttamam');--> statement-breakpoint
CREATE TABLE "examResult" (
	"examId" uuid PRIMARY KEY NOT NULL,
	"aksharaShuddhi" integer NOT NULL,
	"swaraShuddhi" integer NOT NULL,
	"niyantranaAnargalata" integer NOT NULL,
	"shraavyata" integer NOT NULL,
	"pratishakyaGrammar" integer NOT NULL,
	"childrenBonus" integer NOT NULL,
	"total" integer NOT NULL,
	"outcome" "examOutcome" NOT NULL,
	"notes" text,
	"evaluatorId" uuid NOT NULL,
	"evaluatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "examResult_aksharaShuddhi_range" CHECK ("examResult"."aksharaShuddhi" BETWEEN 0 AND 50),
	CONSTRAINT "examResult_swaraShuddhi_range" CHECK ("examResult"."swaraShuddhi" BETWEEN 0 AND 30),
	CONSTRAINT "examResult_niyantranaAnargalata_range" CHECK ("examResult"."niyantranaAnargalata" BETWEEN 0 AND 20),
	CONSTRAINT "examResult_shraavyata_range" CHECK ("examResult"."shraavyata" BETWEEN 0 AND 5),
	CONSTRAINT "examResult_pratishakyaGrammar_range" CHECK ("examResult"."pratishakyaGrammar" BETWEEN 0 AND 5),
	CONSTRAINT "examResult_childrenBonus_values" CHECK ("examResult"."childrenBonus" IN (0, 5, 10)),
	CONSTRAINT "examResult_total_is_sum" CHECK ("examResult"."total" = "examResult"."aksharaShuddhi" + "examResult"."swaraShuddhi" + "examResult"."niyantranaAnargalata" + "examResult"."shraavyata" + "examResult"."pratishakyaGrammar" + "examResult"."childrenBonus")
);
--> statement-breakpoint
ALTER TABLE "trackCertification" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "trackCertification" CASCADE;--> statement-breakpoint
ALTER TABLE "exam" DROP CONSTRAINT "exam_chapterId_chapter_id_fk";
--> statement-breakpoint
ALTER TABLE "exam" DROP CONSTRAINT "exam_evaluationId_evaluation_id_fk";
--> statement-breakpoint
DROP INDEX "exam_chapterId_idx";--> statement-breakpoint
ALTER TABLE "exam" ALTER COLUMN "batchId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "registration" ALTER COLUMN "yearOfBirth" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "exam" ADD COLUMN "trackId" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "examResult" ADD CONSTRAINT "examResult_examId_exam_id_fk" FOREIGN KEY ("examId") REFERENCES "exam"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "examResult" ADD CONSTRAINT "examResult_evaluatorId_profile_id_fk" FOREIGN KEY ("evaluatorId") REFERENCES "profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "examResult_evaluatorId_idx" ON "examResult" USING btree ("evaluatorId");--> statement-breakpoint
ALTER TABLE "exam" ADD CONSTRAINT "exam_trackId_track_id_fk" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exam_trackId_idx" ON "exam" USING btree ("trackId");--> statement-breakpoint
ALTER TABLE "exam" DROP COLUMN "chapterId";--> statement-breakpoint
ALTER TABLE "exam" DROP COLUMN "evaluationId";--> statement-breakpoint
ALTER TABLE "exam" DROP COLUMN "performedAt";