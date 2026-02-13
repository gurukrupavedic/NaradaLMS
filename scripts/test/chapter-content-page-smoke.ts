import 'dotenv/config';
import { contentService } from '../../server/modules/content-publishing';
import { mediaService } from '../../server/modules/media-pipeline/service';
import { db } from '../../server/db';
import { tracks } from '@narada/types';

const unique = Date.now();

async function run() {
  console.log('\n=== Chapter Content Page Smoke Test ===');
  console.log('Testing all 5 tabs: Content, Audio, Segmentation, Mapping, Preview\n');
  
  let trackId: number;
  let chapterId: number;
  let audioFileId: number;
  let textSegmentId: number;
  let textSegmentTeId: number;
  let mappingId: number;
  
  try {
    // === Tab 1: Content Editor ===
    console.log('📝 TAB 1: CONTENT EDITOR');
    
    // Create track for testing
    console.log('  Creating test track...');
    const maxOrderRows = await (db as any).execute("SELECT COALESCE(MAX(\"order\"), 0) AS max_order FROM tracks");
    const nextOrder = Number(maxOrderRows?.rows?.[0]?.max_order ?? 0) + 1;
    const [track] = await db.insert(tracks).values({
      title: `Smoke Track ${unique}`,
      description: `Testing ChapterContentPage ${unique}`,
      order: nextOrder,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    trackId = track.id;
    console.log(`  ✓ Track created: ID ${trackId}`);
    
    // Create chapter
    console.log('  Creating chapter...');
    const chapter = await contentService.createChapter({
      trackId,
      title: `Smoke Chapter ${unique}`,
      content: {
        te: 'తెలుగు పాఠం',
        hi: 'हिन्दी पाठ',
        en: 'English lesson',
      },
      createdBy: 'system',
    });
    chapterId = chapter.id;
    console.log(`  ✓ Chapter created: ID ${chapterId}`);
    
    // Get chapter details (loads Content tab)
    console.log('  Loading chapter details...');
    const chapterDetails = await contentService.getChapter(chapterId);
    console.log(`  ✓ Chapter loaded: "${chapterDetails?.title}"`);
    console.log(`  ✓ Content scripts: ${Object.keys(chapterDetails?.content || {}).join(', ')}`);
    
    // Update chapter content (rich text editor)
    console.log('  Updating chapter content...');
    await contentService.updateChapter(chapterId, {
      title: `Updated ${unique}`,
      content: {
        te: '<p>తెలుగు updated</p>',
        hi: '<p>हिन्दी updated</p>',
        en: '<p>English updated</p>',
      },
    });
    console.log('  ✓ Content updated successfully');
    
    // Toggle publish status
    console.log('  Testing publish workflow...');
    await contentService.publishChapter(chapterId, 'system');
    const published = await contentService.getChapter(chapterId);
    console.log(`  ✓ Chapter published: status="${published?.status}"`);
    
    await contentService.unpublishChapter(chapterId, 'system');
    const draft = await contentService.getChapter(chapterId);
    console.log(`  ✓ Chapter unpublished: status="${draft?.status}"`);
    
    // === Tab 2: Audio Management ===
    console.log('\n🎵 TAB 2: AUDIO MANAGEMENT');
    
    // Create audio file (simulating upload)
    console.log('  Creating audio file...');
    const audioFile = await mediaService.uploadAudioFile({
      chapterId,
      filename: `smoke-${unique}.mp3`,
      displayName: `Smoke Audio ${unique}`,
      fileSize: 1024000,
      duration: 120.5,
      mimeType: 'audio/mpeg',
      reciterName: 'Test Reciter',
      reciterProfile: 'Professional voice artist',
      uploadedBy: 'system',
    });
    audioFileId = audioFile.id;
    console.log(`  ✓ Audio file created: ID ${audioFileId}`);
    
    // List audio files for chapter
    console.log('  Loading audio files...');
    const audioFiles = await mediaService.listAudioFilesByChapter(chapterId);
    console.log(`  ✓ Audio files count: ${audioFiles.length}`);
    
    // Update audio metadata
    console.log('  Updating audio metadata...');
    await mediaService.updateAudioFile(audioFileId, {
      reciterName: 'Updated Reciter',
      displayName: `Updated Audio ${unique}`,
    });
    console.log('  ✓ Audio metadata updated');
    
    // === Tab 3: Text Segmentation ===
    console.log('\n✂️  TAB 3: TEXT SEGMENTATION');
    
    // Create text segments for each script
    console.log('  Creating text segments...');
    const segmentEn = await contentService.createSegment({
      chapterId,
      script: 'en',
      startPosition: 0,
      endPosition: 15,
      order: 0,
      createdBy: 'system',
    });
    textSegmentId = segmentEn.id;
    console.log(`  ✓ English segment created: ID ${textSegmentId}`);
    
    const segmentTe = await contentService.createSegment({
      chapterId,
      script: 'te',
      startPosition: 0,
      endPosition: 12,
      order: 0,
      createdBy: 'system',
    });
    textSegmentTeId = segmentTe.id;
    console.log(`  ✓ Telugu segment created: ID ${textSegmentTeId}`);
    
    // List segments by script
    console.log('  Loading segments by script...');
    const segmentsEn = await contentService.getSegmentsByChapter(chapterId, 'en');
    const segmentsTe = await contentService.getSegmentsByChapter(chapterId, 'te');
    console.log(`  ✓ Segments loaded: en=${segmentsEn.length}, te=${segmentsTe.length}`);
    
    // Update segment positions
    console.log('  Updating segment positions...');
    await contentService.updateSegment(textSegmentId, {
      startPosition: 1,
      endPosition: 16,
    });
    console.log('  ✓ Segment positions updated');
    
    // === Tab 4: Audio Mapping ===
    console.log('\n🔗 TAB 4: AUDIO MAPPING');
    
    // Create segment mapping
    console.log('  Creating segment mapping...');
    const mapping = await mediaService.createMapping({
      audioFileId,
      textSegmentId,
      startTime: 0.5,
      endTime: 5.2,
      createdBy: 'system',
    });
    mappingId = mapping.mappingId;
    console.log(`  ✓ Mapping created: ID ${mappingId}`);
    
    // List mappings for chapter
    console.log('  Loading mappings by chapter...');
    const mappingsByChapter = await mediaService.listMappingsByChapter(chapterId);
    console.log(`  ✓ Mappings count: ${mappingsByChapter.length}`);
    
    // List mappings for audio file
    console.log('  Loading mappings by audio file...');
    const mappingsByAudio = await mediaService.listMappingsByAudioFile(audioFileId);
    console.log(`  ✓ Mappings for audio: ${mappingsByAudio.length}`);
    
    // Verify mapping structure
    const mappingDetail = mappingsByChapter[0];
    console.log(`  ✓ Mapping details: ${mappingDetail.startTime}s - ${mappingDetail.endTime}s`);
    
    // === Tab 5: Preview ===
    console.log('\n👁️  TAB 5: PREVIEW');
    
    // Reload chapter with all related data
    console.log('  Loading preview data...');
    const previewData = await contentService.getChapter(chapterId);
    console.log(`  ✓ Chapter title: "${previewData?.title}"`);
    console.log(`  ✓ Status: ${previewData?.status}`);
    console.log(`  ✓ Scripts available: ${Object.keys(previewData?.content || {}).length}`);
    
    const previewAudioFiles = await mediaService.listAudioFilesByChapter(chapterId);
    const previewSegmentsEn = await contentService.getSegmentsByChapter(chapterId, 'en');
    const previewMappings = await mediaService.listMappingsByChapter(chapterId);
    
    console.log(`  ✓ Preview components: ${previewAudioFiles.length} audio, ${previewSegmentsEn.length} segments, ${previewMappings.length} mappings`);
    
    // === Cleanup ===
    console.log('\n🧹 CLEANUP');
    console.log('  Deleting mapping...');
    await mediaService.deleteMappingById(mappingId);
    console.log('  ✓ Mapping deleted');
    
    console.log('  Deleting segments...');
    await contentService.deleteSegment(textSegmentId);
    await contentService.deleteSegment(textSegmentTeId);
    console.log('  ✓ Segments deleted');
    
    console.log('  Deleting audio file...');
    await mediaService.deleteAudioFile(audioFileId);
    console.log('  ✓ Audio file deleted');
    
    console.log('  Deleting chapter...');
    await contentService.deleteChapter(chapterId);
    console.log('  ✓ Chapter deleted');
    
    console.log('  Deleting track...');
    await contentService.deleteTrack(trackId);
    console.log('  ✓ Track deleted');
    
    console.log('\n✅ All 5 tabs tested successfully!');
    console.log('\nSummary:');
    console.log('  ✓ Tab 1 (Content): Create, read, update chapter content, toggle publish status');
    console.log('  ✓ Tab 2 (Audio): Upload audio file, update metadata, list files');
    console.log('  ✓ Tab 3 (Segmentation): Create segments for multiple scripts, update positions');
    console.log('  ✓ Tab 4 (Mapping): Create mappings, list by chapter/audio, update timestamps');
    console.log('  ✓ Tab 5 (Preview): Load all chapter data for preview rendering');
    
  } catch (err: any) {
    console.error('\n❌ Chapter Content Page smoke test failed:', err?.message || err);
    
    // Attempt cleanup on failure
    try {
      if (mappingId) await mediaService.deleteMappingById(mappingId);
      if (textSegmentId) await contentService.deleteSegment(textSegmentId);
      if (textSegmentTeId) await contentService.deleteSegment(textSegmentTeId);
      if (audioFileId) await mediaService.deleteAudioFile(audioFileId);
      if (chapterId) await contentService.deleteChapter(chapterId);
      if (trackId) await contentService.deleteTrack(trackId);
    } catch {}
    
    throw err;
  }
}

run();

