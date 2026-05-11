import 'dotenv/config';
import { contentService } from '../../server/modules/content-publishing';
import { mediaService } from '../../server/modules/media-pipeline/service';
import { db } from '../../server/db';
import { organizations, tracks, users } from '@narada/types';
import { CURRICULUM_IMPORT_ACTOR_PROFILE } from '../../server/shared/constants/system-actors';
import { eq } from 'drizzle-orm';

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  console.log('\n=== Content Smoke Test ===');
  const unique = Date.now();
  try {
    const [slmtsOrg] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, 'slmts'))
      .limit(1);

    assert(Boolean(slmtsOrg), 'Expected seeded SLMTS organization');

    await db.insert(users).values({
      ...CURRICULUM_IMPORT_ACTOR_PROFILE,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();

    // Create Track
    console.log('Creating track...');
    // Create track directly via DB to avoid legacy service mismatch
    // Query max sort order from tracks table
    const maxOrderRows = await (db as any).execute("SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM tracks");
    const nextOrder = Number(maxOrderRows?.rows?.[0]?.max_order ?? 0) + 1;
    const [track] = await db.insert(tracks).values({ orgId: slmtsOrg!.id, title: `Smoke Track ${unique}`, description: `Smoke description ${unique}`, sortOrder: nextOrder, createdBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id, createdAt: new Date(), updatedAt: new Date() }).returning();
    console.log('Track created:', track);

    // List Tracks
    const tracksList = await contentService.listTracks(slmtsOrg!.id);
    const foundTrack = tracksList.find(t => t.id === track.id);
    console.log('Tracks count:', tracksList.length, 'Found created:', Boolean(foundTrack));

    // Create Chapter
    console.log('Creating chapter...');
    const chapter = await contentService.createChapter({ orgId: slmtsOrg!.id, trackId: track.id, title: `Smoke Chapter ${unique}`, content: { te: '', hi: '', en: '' }, createdBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id });
    console.log('Chapter created:', chapter);

    // Get Chapter Details
    const chapterDetails = await contentService.getChapter(chapter.id, slmtsOrg!.id);
    console.log('Chapter details includes track:', Boolean(chapterDetails?.track));

    // Create Segments
    console.log('Creating segments...');
    const seg1 = await contentService.createSegment({ chapterId: chapter.id, script: 'en', startPosition: 0, endPosition: 10, order: 0, createdBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id });
    const seg2 = await contentService.createSegment({ chapterId: chapter.id, script: 'en', startPosition: 10, endPosition: 20, order: 1, createdBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id });
    const seg3 = await contentService.createSegment({ chapterId: chapter.id, script: 'en', startPosition: 20, endPosition: 30, order: 2, createdBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id });
    const segs = await contentService.getSegmentsByChapter(chapter.id, 'en');
    console.log('Segments created:', segs.length);
    assert(segs.length === 3, 'Expected 3 created segments');

    // Reorder Segments (full-set payload required)
    await contentService.reorderSegments(chapter.id, 'en', [
      { id: seg1.id, order: 2 },
      { id: seg2.id, order: 0 },
      { id: seg3.id, order: 1 },
    ]);
    const reordered = await contentService.getSegmentsByChapter(chapter.id, 'en');
    console.log('Segment order after reorder:', reordered.map(s => s.order));
    assert(JSON.stringify(reordered.map((s) => s.order)) === JSON.stringify([0, 1, 2]), 'Expected contiguous 0..2 order after reorder');
    assert(reordered[0].id === seg2.id && reordered[1].id === seg3.id && reordered[2].id === seg1.id, 'Expected reordered IDs to match payload');

    // Invalid reorder payload should fail (not full-set)
    let fullSetValidationFailed = false;
    try {
      await contentService.reorderSegments(chapter.id, 'en', [{ id: seg1.id, order: 0 }]);
    } catch (error: any) {
      fullSetValidationFailed = error?.code === 'SEGMENT_ORDERS_MUST_INCLUDE_FULL_SET';
    }
    assert(fullSetValidationFailed, 'Expected full-set reorder validation failure');

    // Duplicate order values should fail validation before DB write
    let duplicateOrderFailed = false;
    try {
      await contentService.reorderSegments(chapter.id, 'en', [
        { id: seg1.id, order: 0 },
        { id: seg2.id, order: 0 },
        { id: seg3.id, order: 1 },
      ]);
    } catch (error: any) {
      duplicateOrderFailed = error?.code === 'DUPLICATE_SEGMENT_ORDER';
    }
    assert(duplicateOrderFailed, 'Expected duplicate order validation failure');

    // Upload Audio (DB insert via service)
    console.log('Uploading audio (DB)...');
    const audio = await mediaService.uploadAudioFile({ chapterId: chapter.id, filename: `smoke-${unique}.mp3`, displayName: `smoke-${unique}.mp3`, fileSize: 12345, duration: 30, mimeType: 'audio/mpeg', uploadedBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id });
    console.log('Audio created:', audio);

    // Create Mapping (ms contract)
    console.log('Creating mapping...');
    const mapping = await mediaService.createMapping({ audioFileId: audio.id, textSegmentId: seg2.id, startMs: 0, endMs: 5000, createdBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id });
    console.log('Mapping created:', mapping);

    // List mappings
    const mapsByChapter = await mediaService.listMappingsByChapter(chapter.id);
    const mapsByAudio = await mediaService.listMappingsByAudioFile(audio.id);
    console.log('Mappings by chapter:', mapsByChapter.length, 'Mappings by audio:', mapsByAudio.length);

    // Update mapping timestamps (ms contract)
    console.log('Updating mapping timestamps...');
    const updatedMediaSeg = await mediaService.updateMediaSegment(mapping.mediaSegmentId, { startMs: 1000, endMs: 6000 } as any);
    console.log('Updated media segment:', updatedMediaSeg);

    // Cleanup
    console.log('Cleaning up mapping, audio, segments, chapter, track...');
    await mediaService.deleteMappingById(mapping.mappingId);
    await mediaService.deleteAudioFile(audio.id);
    await contentService.deleteSegment(seg1.id);
    await contentService.deleteSegment(seg2.id);
    await contentService.deleteSegment(seg3.id);
    await contentService.deleteChapter(chapter.id, slmtsOrg!.id);
    await contentService.deleteTrack(track.id, slmtsOrg!.id);

    console.log('\n✅ Content smoke test completed successfully');
  } catch (err: any) {
    console.error('\n❌ Content smoke test failed:', err?.message || err);
    throw err;
  }
}

run();

