CREATE TYPE "registrationStatus" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "registration" (
	"id" uuid PRIMARY KEY NOT NULL,
	"status" "registrationStatus" DEFAULT 'pending' NOT NULL,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"yearOfBirth" integer,
	"phone" text NOT NULL,
	"email" text,
	"city" text,
	"countryTimeZone" text,
	"learningGoal" text,
	"currentProficiency" "proficiencyLevel",
	"spokenLanguages" text[] DEFAULT '{}' NOT NULL,
	"readLanguages" text[] DEFAULT '{}' NOT NULL,
	"parentNames" text[] DEFAULT '{}' NOT NULL,
	"dressCodeAgreed" boolean DEFAULT false NOT NULL,
	"noMeatAgreed" boolean DEFAULT false NOT NULL,
	"noAlcoholAgreed" boolean DEFAULT false NOT NULL,
	"noSmokingAgreed" boolean DEFAULT false NOT NULL,
	"comments" text,
	"reviewedAt" timestamp,
	"reviewedBy" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "registration" ADD CONSTRAINT "registration_reviewedBy_profile_id_fk" FOREIGN KEY ("reviewedBy") REFERENCES "profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "registration_status_createdAt_idx" ON "registration" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "registration_phone_idx" ON "registration" USING btree ("phone");