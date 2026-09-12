CREATE TYPE "public"."deviceLinkStatus" AS ENUM('pending', 'approved', 'claimed', 'expired');--> statement-breakpoint
CREATE TABLE "deviceLinkCode" (
	"id" uuid PRIMARY KEY NOT NULL,
	"userId" text,
	"code" text NOT NULL,
	"status" "deviceLinkStatus" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"requestUserAgent" text,
	"expiresAt" timestamp NOT NULL,
	"approvedAt" timestamp,
	"claimedAt" timestamp,
	"claimedSessionId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deviceLinkCode_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "deviceLinkCode" ADD CONSTRAINT "deviceLinkCode_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deviceLinkCode" ADD CONSTRAINT "deviceLinkCode_claimedSessionId_session_id_fk" FOREIGN KEY ("claimedSessionId") REFERENCES "public"."session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deviceLinkCode_status_expiresAt_idx" ON "deviceLinkCode" USING btree ("status","expiresAt");--> statement-breakpoint
CREATE INDEX "deviceLinkCode_userId_idx" ON "deviceLinkCode" USING btree ("userId");