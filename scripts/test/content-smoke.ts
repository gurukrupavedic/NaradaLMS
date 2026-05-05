import 'dotenv/config';
import { contentService } from '../../server/modules/content-publishing';
import { mediaService } from '../../server/modules/media-pipeline/service';
import { db } from '../../server/db';
import { tracks, users } from '@narada/types';
import { CURRICULUM_IMPORT_ACTOR_PROFILE } from '../../server/shared/constants/system-actors';

async function run() {
  console.log('\n=== Content Smoke Test ===');
  const unique = Date.now();
  try {
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
    const [track] = await db.insert(tracks).values({ title: `Smoke Track ${unique}`, description: `Smoke description ${unique}`, sortOrder: nextOrder, createdBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id, createdAt: new Date(), updatedAt: new Date() }).returning();
    console.log('Track created:', track);

    // List Tracks
    const tracksList = await contentService.listTracks();
    const foundTrack = tracksList.find(t => t.id === track.id);
    console.log('Tracks count:', tracksList.length, 'Found created:', Boolean(foundTrack));

    // Create Chapter
    console.log('Creating chapter...');
    const chapter = await contentService.createChapter({ trackId: track.id, title: `Smoke Chapter ${unique}`, content: { te: '', hi: '', en: '' }, createdBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id });
    console.log('Chapter created:', chapter);

    // Get Chapter Details
    const chapterDetails = await contentService.getChapter(chapter.id);
    console.log('Chapter details includes track:', Boolean(chapterDetails?.track));

    // Create Segments
    console.log('Creating segments...');
    const seg1 = await contentService.createSegment({ chapterId: chapter.id, script: 'en', startPosition: 0, endPosition: 10, order: 0, createdBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id });
    const seg2 = await contentService.createSegment({ chapterId: chapter.id, script: 'en', startPosition: 10, endPosition: 20, order: 1, createdBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id });
    const segs = await contentService.getSegmentsByChapter(chapter.id, 'en');
    console.log('Segments created:', segs.length);

    // Reorder Segments
    await contentService.reorderSegments(chapter.id, [ { id: seg1.id, order: 1 }, { id: seg2.id, order: 0 } ]);
    const reordered = await contentService.getSegmentsByChapter(chapter.id, 'en');
    console.log('Segment order after reorder:', reordered.map(s => s.order));

    // Upload Audio (DB insert via service)
    console.log('Uploading audio (DB)...');
    const audio = await mediaService.uploadAudioFile({ chapterId: chapter.id, filename: `smoke-${unique}.mp3`, displayName: `smoke-${unique}.mp3`, fileSize: 12345, duration: 30, mimeType: 'audio/mpeg', uploadedBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id });
    console.log('Audio created:', audio);

    // Create Mapping
    console.log('Creating mapping...');
    const mapping = await mediaService.createMapping({ audioFileId: audio.id, textSegmentId: seg1.id, startTime: 0, endTime: 5, createdBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id });
    console.log('Mapping created:', mapping);

    // List mappings
    const mapsByChapter = await mediaService.listMappingsByChapter(chapter.id);
    const mapsByAudio = await mediaService.listMappingsByAudioFile(audio.id);
    console.log('Mappings by chapter:', mapsByChapter.length, 'Mappings by audio:', mapsByAudio.length);

    // Update mapping timestamps
    console.log('Updating mapping timestamps...');
    const updatedMediaSeg = await mediaService.updateMediaSegment(mapping.mediaSegmentId, { startTimestamp: 1, endTimestamp: 6 } as any);
    console.log('Updated media segment:', updatedMediaSeg);

    // Cleanup
    console.log('Cleaning up mapping, audio, segments, chapter, track...');
    await mediaService.deleteMappingById(mapping.mappingId);
    await mediaService.deleteAudioFile(audio.id);
    await contentService.deleteSegment(seg1.id);
    await contentService.deleteSegment(seg2.id);
    await contentService.deleteChapter(chapter.id);
    await contentService.deleteTrack(track.id);

    console.log('\n✅ Content smoke test completed successfully');
  } catch (err: any) {
    console.error('\n❌ Content smoke test failed:', err?.message || err);
    throw err;
  }
}

run();

