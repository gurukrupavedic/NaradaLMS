CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" varchar DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organizations_status_check" CHECK ("organizations"."status" IN ('active', 'inactive'))
);
--> statement-breakpoint
CREATE TABLE "user_organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"org_id" uuid NOT NULL,
	"roles" text[] DEFAULT ARRAY['student']::text[] NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_organizations_user_org_uniq" UNIQUE("user_id","org_id"),
	CONSTRAINT "user_organizations_status_check" CHECK ("user_organizations"."status" IN ('pending', 'active', 'inactive', 'rejected')),
	CONSTRAINT "user_organizations_roles_subset_check" CHECK ("user_organizations"."roles" <@ ARRAY['student','instructor','admin']::text[])
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_super_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_organizations" ADD CONSTRAINT "user_organizations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_organizations" ADD CONSTRAINT "user_organizations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_organizations" ADD CONSTRAINT "user_organizations_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_org_user_id" ON "user_organizations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_org_org_id" ON "user_organizations" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_user_org_status" ON "user_organizations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_user_org_org_status" ON "user_organizations" USING btree ("org_id","status");