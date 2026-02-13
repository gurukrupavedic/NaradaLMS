// @ts-check
import 'dotenv/config';
import { db } from './db';
import { users, tracks, chapters } from '@narada/types';
import { eq, or, and } from 'drizzle-orm';
import newTracksData from './seeds/tracks-4-8.json';

/**
 * Seed the database with additional Vedic curriculum tracks (4-8)
 * This is an additive script that checks for existence before inserting
 */
async function addNewTracks() {
    console.log('🌱 Adding Tracks 4-8 to curriculum...');

    try {
        // 1. Ensure system user exists
        const [systemUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, "system"))
            .limit(1);

        if (!systemUser) {
            console.log('Creating system user...');
            await db.insert(users).values({
                id: "system",
                email: "system@naradalms.local",
                firstName: "System",
                lastName: "Admin",
                passwordHash: "system_placeholder_hash",
                roles: ["admin"],
                status: "active",
                createdAt: new Date(),
                updatedAt: new Date()
            }).onConflictDoNothing();
        }

        // 2. Insert tracks
        console.log(`Processing ${newTracksData.tracks.length} tracks...`);
        const insertedTracks: typeof tracks.$inferSelect[] = [];

        for (const trackData of newTracksData.tracks) {
            // Check if track exists by order or title
            const [existingTrack] = await db
                .select()
                .from(tracks)
                .where(or(
                    eq(tracks.order, trackData.order),
                    eq(tracks.title, trackData.title)
                ))
                .limit(1);

            if (existingTrack) {
                console.log(`- Skipped existing track: ${trackData.title} (Order: ${trackData.order})`);
                insertedTracks.push(existingTrack);
            } else {
                const [newTrack] = await db.insert(tracks).values({
                    ...trackData,
                    createdBy: "system",
                    createdAt: new Date(),
                    updatedAt: new Date()
                }).returning();
                console.log(`+ Created track: ${newTrack.title}`);
                insertedTracks.push(newTrack);
            }
        }

        // 3. Insert chapters
        console.log(`Processing ${newTracksData.chapters.length} chapters...`);
        let addedChaptersCount = 0;
        let skippedChaptersCount = 0;

        for (const chapterData of newTracksData.chapters) {
            // Find the track by its order number
            const track = insertedTracks.find((t) => t.order === chapterData.trackOrder);
            if (!track) {
                console.error(`! Warning: Track with order ${chapterData.trackOrder} not found for chapter "${chapterData.title}"`);
                continue;
            }

            // Check if chapter exists in this track with same order or title
            const [existingChapter] = await db
                .select()
                .from(chapters)
                .where(and(
                    eq(chapters.trackId, track.id),
                    eq(chapters.order, chapterData.order)
                ))
                .limit(1);

            if (existingChapter) {
                skippedChaptersCount++;
            } else {
                await db.insert(chapters).values({
                    trackId: track.id,
                    title: chapterData.title,
                    order: chapterData.order,
                    status: chapterData.status as "draft" | "published",
                    content: {},
                    createdBy: "system",
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                addedChaptersCount++;
            }
        }

        console.log(`\n✅ Finished adding Tracks 4-8`);
        console.log(`   Tracks processed: ${insertedTracks.length}`);
        console.log(`   Chapters added: ${addedChaptersCount}`);
        console.log(`   Chapters skipped: ${skippedChaptersCount}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding tracks:', error);
        process.exit(1);
    }
}

addNewTracks();
