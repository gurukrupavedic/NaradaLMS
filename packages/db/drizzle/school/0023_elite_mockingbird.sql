CREATE TABLE "counterLog" (
	"profileId" uuid NOT NULL,
	"courseId" uuid NOT NULL,
	"counterKey" text NOT NULL,
	"loggedOn" date NOT NULL,
	"count" integer NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "counterLog_profileId_courseId_counterKey_loggedOn_pk" PRIMARY KEY("profileId","courseId","counterKey","loggedOn"),
	CONSTRAINT "counterLog_count_valid" CHECK ("counterLog"."count" > 0 AND "counterLog"."count" <= 1000000)
);
--> statement-breakpoint
ALTER TABLE "counterLog" ADD CONSTRAINT "counterLog_profileId_profile_id_fk" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counterLog" ADD CONSTRAINT "counterLog_courseId_course_id_fk" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE no action ON UPDATE no action;