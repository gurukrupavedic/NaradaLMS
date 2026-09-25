CREATE TABLE "japamLog" (
	"profileId" uuid NOT NULL,
	"loggedOn" date NOT NULL,
	"count" integer NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "japamLog_profileId_loggedOn_pk" PRIMARY KEY("profileId","loggedOn"),
	CONSTRAINT "japamLog_count_valid" CHECK ("japamLog"."count" > 0 AND "japamLog"."count" <= 1000000)
);
--> statement-breakpoint
ALTER TABLE "japamLog" ADD CONSTRAINT "japamLog_profileId_profile_id_fk" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE no action ON UPDATE no action;