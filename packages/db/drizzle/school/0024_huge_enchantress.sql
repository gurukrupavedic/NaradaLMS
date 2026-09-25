CREATE TABLE "courseProfile" (
	"profileId" uuid NOT NULL,
	"courseId" uuid NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "courseProfile_profileId_courseId_pk" PRIMARY KEY("profileId","courseId")
);
--> statement-breakpoint
DROP TABLE "counterLog" CASCADE;--> statement-breakpoint
ALTER TABLE "courseProfile" ADD CONSTRAINT "courseProfile_profileId_profile_id_fk" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courseProfile" ADD CONSTRAINT "courseProfile_courseId_course_id_fk" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE no action ON UPDATE no action;