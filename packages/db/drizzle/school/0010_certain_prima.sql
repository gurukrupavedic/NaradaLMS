ALTER TABLE "profile" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "yearOfBirth" integer;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "countryTimeZone" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "learningGoal" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "currentProficiency" "proficiencyLevel";--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "spokenLanguages" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "readLanguages" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "parentNames" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "dressCodeAgreed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "noMeatAgreed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "noAlcoholAgreed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "noSmokingAgreed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "comments" text;