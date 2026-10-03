CREATE TABLE "trackTa" (
	"trackId" uuid NOT NULL,
	"profileId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trackTa_trackId_profileId_pk" PRIMARY KEY("trackId","profileId")
);
--> statement-breakpoint
ALTER TABLE "trackTa" ADD CONSTRAINT "trackTa_trackId_track_id_fk" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trackTa" ADD CONSTRAINT "trackTa_profileId_profile_id_fk" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE cascade ON UPDATE no action;