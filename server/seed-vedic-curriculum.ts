import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { chapters, organizations, tracks, users } from "@narada/types";
import curriculumData from "./seeds/curriculum.json";
import { db } from "./db";
import { CURRICULUM_IMPORT_ACTOR_PROFILE } from "./shared/constants/system-actors";

type CurriculumChapter = {
  title: string;
  number: number;
  status?: string;
  content?: Record<string, unknown>;
};

type CurriculumTrack = {
  title: string;
  description?: string | null;
  number: number;
  chapters?: CurriculumChapter[];
};

const curriculum = curriculumData as {
  tracks: CurriculumTrack[];
};

/**
 * Seed the SLMTS curriculum structure from the checked-in JSON asset.
 * This script upserts tracks and chapters, including chapter content payloads.
 */
async function seedVedicCurriculum() {
  console.log("🌱 Starting Vedic curriculum seed...");

  try {
    const [slmtsOrg] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, "slmts"))
      .limit(1);

    if (!slmtsOrg) {
      throw new Error("SLMTS organization not found. Run `npm run db:seed-orgs` first.");
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

    console.log(`Syncing ${curriculum.tracks.length} tracks for SLMTS...`);

    let totalTracks = 0;
    let totalChapters = 0;

    for (const trackData of curriculum.tracks) {
      const now = new Date();
      const trackValues = {
        orgId: slmtsOrg.id,
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
            orgId: slmtsOrg.id,
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

    console.log("\n✅ Vedic curriculum seed complete.");
    console.log(`   ${totalTracks} tracks synced`);
    console.log(`   ${totalChapters} chapters synced`);
    console.log(
      "\n📝 This seed syncs SLMTS curriculum structure from server/seeds/curriculum.json."
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
  seedVedicCurriculum()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seedVedicCurriculum };
