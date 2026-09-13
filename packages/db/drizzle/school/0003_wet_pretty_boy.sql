CREATE TABLE "trackCertification" (
	"id" uuid PRIMARY KEY NOT NULL,
	"trackId" uuid NOT NULL,
	"studentId" uuid NOT NULL,
	"level" "proficiencyLevel" NOT NULL,
	"notes" text,
	"evaluatorId" uuid NOT NULL,
	"evaluatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "trackCertification" ADD CONSTRAINT "trackCertification_trackId_track_id_fk" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trackCertification" ADD CONSTRAINT "trackCertification_studentId_profile_id_fk" FOREIGN KEY ("studentId") REFERENCES "profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trackCertification" ADD CONSTRAINT "trackCertification_evaluatorId_profile_id_fk" FOREIGN KEY ("evaluatorId") REFERENCES "profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trackCertification_studentId_trackId_idx" ON "trackCertification" USING btree ("studentId","trackId");