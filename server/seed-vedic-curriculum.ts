import 'dotenv/config';
import { db } from './db';
import { users, tracks, chapters } from '../shared/schema';
import curriculumData from './seeds/curriculum.json';

/**
 * Seed the database with Vedic curriculum structure
 * This populates tracks and chapters WITHOUT content - content is added via UI
 */
async function seedVedicCurriculum() {
  console.log('🌱 Starting Vedic curriculum seed...');

  try {
    // 1. Create system user (required for foreign key constraints)
    console.log('Creating system user...');
    await db.insert(users).values({
      id: "system",
      email: "system@vediclms.local",
      roles: ["admin"],
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date()
    }).onConflictDoNothing();

    // 2. Insert tracks
    console.log(`Inserting ${curriculumData.tracks.length} tracks...`);
    const trackValues = curriculumData.tracks.map(track => ({
      ...track,
      createdBy: "system",
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    const insertedTracks = await db.insert(tracks).values(trackValues).returning();
    console.log(`✓ Created ${insertedTracks.length} tracks`);

    // 3. Insert chapters (linking to tracks by order)
    console.log(`Inserting ${curriculumData.chapters.length} chapters...`);
    const chapterValues = curriculumData.chapters.map(chapter => {
      // Find the track by its order number
      const track = insertedTracks.find(t => t.order === chapter.trackOrder);
      if (!track) {
        throw new Error(`Track with order ${chapter.trackOrder} not found`);
      }

      return {
        trackId: track.id,
        title: chapter.title,
        order: chapter.order,
        status: chapter.status as "draft" | "published",
        content: {}, // Empty - content added via UI
        createdBy: "system",
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    await db.insert(chapters).values(chapterValues);
    console.log(`✓ Created ${chapterValues.length} chapters`);

    console.log('\n✅ Vedic curriculum seeded successfully!');
    console.log(`   ${insertedTracks.length} tracks`);
    console.log(`   ${chapterValues.length} chapters`);
    console.log('\n📝 Content (multilingual text, audio, segments) should be added via the UI.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding curriculum:', error);
    process.exit(1);
  }
}

seedVedicCurriculum();
