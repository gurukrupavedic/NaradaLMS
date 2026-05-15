ALTER TABLE "batches" DROP CONSTRAINT "batches_batch_code_uniq";--> statement-breakpoint
ALTER TABLE "tracks" DROP CONSTRAINT "tracks_title_unique";--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "org_id" uuid;--> statement-breakpoint
ALTER TABLE "chapters" ADD COLUMN "org_id" uuid;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "org_id" uuid;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "org_id" uuid;--> statement-breakpoint
DO $$
DECLARE
  slmts_org_id uuid;
BEGIN
  SELECT id INTO slmts_org_id
  FROM organizations
  WHERE slug = 'slmts'
  LIMIT 1;

  IF slmts_org_id IS NULL AND (
    EXISTS (SELECT 1 FROM tracks) OR
    EXISTS (SELECT 1 FROM chapters) OR
    EXISTS (SELECT 1 FROM batches) OR
    EXISTS (SELECT 1 FROM enrollments)
  ) THEN
    RAISE EXCEPTION 'Cannot backfill org_id without organizations.slug = ''slmts''';
  END IF;

  UPDATE tracks
  SET org_id = slmts_org_id
  WHERE org_id IS NULL;

  UPDATE chapters
  SET org_id = tracks.org_id
  FROM tracks
  WHERE chapters.track_id = tracks.id
    AND chapters.org_id IS NULL;

  UPDATE chapters
  SET org_id = slmts_org_id
  WHERE org_id IS NULL;

  UPDATE batches
  SET org_id = tracks.org_id
  FROM tracks
  WHERE batches.track_id = tracks.id
    AND batches.org_id IS NULL;

  UPDATE batches
  SET org_id = slmts_org_id
  WHERE org_id IS NULL;

  UPDATE enrollments
  SET org_id = batches.org_id
  FROM batches
  WHERE enrollments.batch_id = batches.id
    AND enrollments.org_id IS NULL;

  UPDATE enrollments
  SET org_id = slmts_org_id
  WHERE org_id IS NULL;
END $$;--> statement-breakpoint
ALTER TABLE "batches" ALTER COLUMN "org_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "org_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "enrollments" ALTER COLUMN "org_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ALTER COLUMN "org_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_batches_org" ON "batches" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_chapters_org" ON "chapters" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_enrollments_org" ON "enrollments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_tracks_org" ON "tracks" USING btree ("org_id");--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_org_batch_code_uniq" UNIQUE("org_id","batch_code");--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_org_title_uniq" UNIQUE("org_id","title");