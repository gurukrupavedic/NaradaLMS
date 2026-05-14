import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { chapters, organizations, tracks, users } from "@narada/types";
import { db } from "../db";
import { CURRICULUM_IMPORT_ACTOR_PROFILE } from "../shared/constants/system-actors";

const SEEDS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../seeds"
);
const DEFAULT_CURRICULUM_FILE = "curriculum-slmts.json";

const curriculumChapterSchema = z.object({
  title: z.string(),
  number: z.number(),
  status: z.string().optional(),
  content: z.record(z.unknown()).optional(),
});

const curriculumTrackSchema = z
  .object({
    title: z.string(),
    description: z.string().nullable().optional(),
    number: z.number(),
    chapters: z.array(curriculumChapterSchema).optional(),
  })
  .passthrough();

/**
 * Root shape for JSON files under `server/seeds/` (for example `curriculum-slmts.json`).
 * `organizationSlug` must match `organizations.slug` (for example `slmts`, `rr`).
 * `editorGuide` and `_exampleSingleTrack` are optional documentation only; they are not written to the database.
 */
const curriculumFileSchema = z.object({
  organizationSlug: z
    .string()
    .min(1, "organizationSlug is required")
    .transform((s) => s.trim().toLowerCase()),
  editorGuide: z.string().optional(),
  /** Same shape as one element of `tracks`; validated but not imported. Remove when no longer needed. */
  _exampleSingleTrack: curriculumTrackSchema.optional(),
  tracks: z.array(curriculumTrackSchema),
});

type CurriculumFile = z.infer<typeof curriculumFileSchema>;

function resolveCurriculumSeedPath(): string {
  const raw = (process.env.CURRICULUM_SEED_FILE ?? DEFAULT_CURRICULUM_FILE).trim();
  if (!raw) {
    throw new Error(
      "CURRICULUM_SEED_FILE is empty. Set it to a filename under server/seeds (for example curriculum-rr.json) or rely on the default curriculum-slmts.json."
    );
  }
  if (path.isAbsolute(raw)) {
    return raw;
  }
  return path.join(SEEDS_DIR, path.basename(raw));
}

function loadCurriculumDocument(seedPath: string): unknown {
  try {
    const text = readFileSync(seedPath, "utf8");
    return JSON.parse(text) as unknown;
  } catch (e) {
    throw new Error(
      `Unable to read curriculum seed file at ${seedPath}. Set CURRICULUM_SEED_FILE or create the default ${DEFAULT_CURRICULUM_FILE} under server/seeds. (${e instanceof Error ? e.message : String(e)})`
    );
  }
}

/**
 * Seeds tracks and chapters for one organization from a curriculum JSON file.
 * Which file is loaded: absolute `CURRICULUM_SEED_FILE`, or `server/seeds/<basename>`,
 * defaulting to `curriculum-slmts.json`.
 */
async function seedCurriculum(): Promise<void> {
  const seedPath = resolveCurriculumSeedPath();
  console.log(`🌱 Starting curriculum seed from ${seedPath}...`);

  try {
    const raw = loadCurriculumDocument(seedPath);
    const parsed = curriculumFileSchema.safeParse(raw);
    if (!parsed.success) {
      const detail = parsed.error.flatten().fieldErrors;
      throw new Error(
        `Invalid curriculum file (${path.basename(seedPath)}): ${JSON.stringify(detail)}`
      );
    }
    const curriculum: CurriculumFile = parsed.data;

    const orgSlug = curriculum.organizationSlug;
    const [targetOrg] = await db
      .select({ id: organizations.id, slug: organizations.slug })
      .from(organizations)
      .where(eq(organizations.slug, orgSlug))
      .limit(1);

    if (!targetOrg) {
      throw new Error(
        `No organization with slug "${orgSlug}". Run \`npm run db:seed-orgs\` first, then align organizationSlug in the seed file.`
      );
    }

    console.log("Ensuring dedicated curriculum import actor exists...");
    await db
      .insert(users)
      .values({
        ...CURRICULUM_IMPORT_ACTOR_PROFILE,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();

    console.log(
      `Syncing ${curriculum.tracks.length} tracks for organization "${targetOrg.slug}"...`
    );

    let totalTracks = 0;
    let totalChapters = 0;

    for (const trackData of curriculum.tracks) {
      const now = new Date();
      const trackValues = {
        orgId: targetOrg.id,
        title: trackData.title,
        description: trackData.description ?? "",
        sortOrder: trackData.number,
        createdBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id,
        createdAt: now,
        updatedAt: now,
      };
      const [syncedTrack] = await db
        .insert(tracks)
        .values(trackValues)
        .onConflictDoUpdate({
          target: [tracks.orgId, tracks.title],
          set: {
            description: trackValues.description,
            sortOrder: trackValues.sortOrder,
            createdBy: trackValues.createdBy,
            updatedAt: trackValues.updatedAt,
          },
        })
        .returning({
          id: tracks.id,
          title: tracks.title,
        });

      totalTracks++;
      console.log(`✓ Synced track: ${syncedTrack.title}`);

      if (trackData.chapters && trackData.chapters.length > 0) {
        for (const chapter of trackData.chapters) {
          const chapterNow = new Date();
          const chapterValues = {
            orgId: targetOrg.id,
            trackId: syncedTrack.id,
            title: chapter.title,
            sortOrder: chapter.number,
            status: chapter.status ?? "published",
            content: chapter.content ?? {},
            createdBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id,
            createdAt: chapterNow,
            updatedAt: chapterNow,
          };

          await db
            .insert(chapters)
            .values(chapterValues)
            .onConflictDoUpdate({
              target: [chapters.trackId, chapters.title],
              set: {
                orgId: chapterValues.orgId,
                sortOrder: chapterValues.sortOrder,
                status: chapterValues.status,
                content: chapterValues.content,
                createdBy: chapterValues.createdBy,
                updatedAt: chapterValues.updatedAt,
              },
            });
          totalChapters++;
        }

        console.log(`  ✓ Synced ${trackData.chapters.length} chapters`);
      }
    }

    console.log("\n✅ Curriculum seed complete.");
    console.log(`   ${totalTracks} tracks synced`);
    console.log(`   ${totalChapters} chapters synced`);
    console.log(
      `   organizationSlug=${orgSlug} (org_id on all rows). Source: ${path.basename(seedPath)}`
    );
  } catch (error) {
    console.error("❌ Error seeding curriculum:", error);
    throw error;
  }
}

const isMainModule =
  process.argv[1] &&
  path.normalize(process.argv[1]) === path.normalize(fileURLToPath(import.meta.url));

if (isMainModule) {
  seedCurriculum()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seedCurriculum };
