import 'dotenv/config';
import { db } from './db';
import { users, tracks, chapters } from '@narada/types';
import curriculumData from './seeds/curriculum.json';
import { CURRICULUM_IMPORT_ACTOR_PROFILE } from './shared/constants/system-actors';

/**
 * Seed the database with Vedic curriculum structure
 * This populates tracks and chapters WITHOUT content - content is added via UI
 */
async function seedVedicCurriculum() {
  console.log('🌱 Starting Vedic curriculum seed...');

  try {
    // 1. Create dedicated import actor (required for foreign key constraints)
    console.log('Creating dedicated curriculum import actor...');
    await db.insert(users).values({
      ...CURRICULUM_IMPORT_ACTOR_PROFILE,
      createdAt: new Date(),
      updatedAt: new Date()
    }).onConflictDoNothing();

    // 2. Insert tracks and chapters hierarchically
    console.log(`Processing ${curriculumData.tracks.length} tracks...`);

    let totalTracks = 0;
    let totalChapters = 0;

    for (const trackData of curriculumData.tracks) {
      // Insert track
      const [insertedTrack] = await db.insert(tracks).values({
        title: trackData.title,
        description: trackData.description,
        sortOrder: (trackData as any).number,
        createdBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      totalTracks++;
      console.log(`✓ Created track: ${insertedTrack.title}`);

      // Insert chapters for this track
      if ((trackData as any).chapters && (trackData as any).chapters.length > 0) {
        const chapterValues = (trackData as any).chapters.map((chapter: any) => ({
          trackId: insertedTrack.id,
          title: chapter.title,
          sortOrder: chapter.number,
          status: chapter.status || "published",
          content: chapter.content || {},
          createdBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        await db.insert(chapters).values(chapterValues);
        totalChapters += chapterValues.length;
        console.log(`  ✓ Created ${chapterValues.length} chapters`);
      }
    }

    console.log('\n✅ Vedic curriculum seeded successfully!');
    console.log(`   ${totalTracks} tracks`);
    console.log(`   ${totalChapters} chapters`);
    console.log('\n📝 Content (multilingual text, audio, segments) is now included in the seed!');

  } catch (error) {
    console.error('❌ Error seeding curriculum:', error);
    throw error;
  }
}

if (require.main === module) {
  seedVedicCurriculum()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seedVedicCurriculum };
