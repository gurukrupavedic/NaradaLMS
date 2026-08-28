ALTER TABLE "user" ADD COLUMN "phoneNumber" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phoneNumberVerified" boolean;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_phoneNumber_unique" UNIQUE("phoneNumber");