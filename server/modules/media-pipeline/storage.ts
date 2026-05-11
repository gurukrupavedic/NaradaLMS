import { db } from '../../db';
import { audioFiles, chapters, mediaSegments, segmentMappings, textSegments } from '@narada/types';
import { eq, and, asc } from 'drizzle-orm';
import type { AudioFile, MediaSegment, MappingWithTimestamps, CreateAudioFileData, CreateMediaSegmentData, CreateMappingData } from './types';

async function getChapterOrgId(chapterId: number): Promise<string> {
  const [chapter] = await db
    .select({ orgId: chapters.orgId })
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);

  if (!chapter) {
    throw Object.assign(new Error(`Chapter ${chapterId} not found`), { status: 404 });
  }

  return chapter.orgId;
}

async function getAudioFileOrgId(audioFileId: number): Promise<string> {
  const [audioFile] = await db
    .select({ orgId: audioFiles.orgId })
    .from(audioFiles)
    .where(eq(audioFiles.id, audioFileId))
    .limit(1);

  if (!audioFile) {
    throw Object.assign(new Error(`Audio file ${audioFileId} not found`), { status: 404 });
  }

  return audioFile.orgId;
}

async function getTextSegmentOrgId(textSegmentId: number): Promise<string> {
  const [textSegment] = await db
    .select({ orgId: textSegments.orgId })
    .from(textSegments)
    .where(eq(textSegments.id, textSegmentId))
    .limit(1);

  if (!textSegment) {
    throw Object.assign(new Error(`Text segment ${textSegmentId} not found`), { status: 404 });
  }

  return textSegment.orgId;
}

export const mediaStorage = {
  async getAudioFilesByChapter(chapterId: number): Promise<AudioFile[]> {
    return await db.select().from(audioFiles).where(eq(audioFiles.chapterId, chapterId));
  },

  async createAudioFile(data: CreateAudioFileData): Promise<AudioFile> {
    const orgId = await getChapterOrgId(data.chapterId);
    const [newFile] = await db.insert(audioFiles).values({
      orgId,
      chapterId: data.chapterId,
      filename: data.filename,
      displayName: data.displayName,
      reciter: data.reciter ?? null,
      duration: data.duration ?? null,
      fileSize: data.fileSize ?? null,
      mimeType: data.mimeType ?? null,
      uploadedBy: data.uploadedBy,
    }).returning();
    return newFile as AudioFile;
  },

  async updateAudioFile(id: number, update: Partial<AudioFile>): Promise<AudioFile> {
    const [updated] = await db.update(audioFiles).set(update).where(eq(audioFiles.id, id)).returning();
    return updated as AudioFile;
  },

  async deleteAudioFile(id: number): Promise<void> {
    await db.delete(audioFiles).where(eq(audioFiles.id, id));
  },

  async getMediaSegmentsByAudioFile(audioFileId: number): Promise<MediaSegment[]> {
    return await db.select().from(mediaSegments).where(eq(mediaSegments.audioFileId, audioFileId)).orderBy(asc(mediaSegments.startMs));
  },

  async createMediaSegment(data: CreateMediaSegmentData): Promise<MediaSegment> {
    const orgId = await getAudioFileOrgId(data.audioFileId);
    const [seg] = await db.insert(mediaSegments).values({
      orgId,
      audioFileId: data.audioFileId,
      startMs: data.startMs,
      endMs: data.endMs,
      segmentName: data.segmentName ?? null,
      createdBy: data.createdBy,
    }).returning();
    return seg as MediaSegment;
  },

  async updateMediaSegment(id: number, update: Partial<MediaSegment>): Promise<MediaSegment> {
    const [seg] = await db.update(mediaSegments).set(update).where(eq(mediaSegments.id, id)).returning();
    return seg as MediaSegment;
  },

  async deleteMediaSegment(id: number): Promise<void> {
    await db.delete(mediaSegments).where(eq(mediaSegments.id, id));
  },

  async getSegmentMappingsByChapter(chapterId: number): Promise<MappingWithTimestamps[]> {
    const rows = await db.select({
      mappingId: segmentMappings.id,
      textSegmentId: segmentMappings.textSegmentId,
      mediaSegmentId: segmentMappings.mediaSegmentId,
      audioFileId: mediaSegments.audioFileId,
      startMs: mediaSegments.startMs,
      endMs: mediaSegments.endMs,
      segmentName: mediaSegments.segmentName,
    })
      .from(segmentMappings)
      .leftJoin(mediaSegments, eq(segmentMappings.mediaSegmentId, mediaSegments.id))
      .leftJoin(textSegments, eq(segmentMappings.textSegmentId, textSegments.id))
      .where(eq(textSegments.chapterId, chapterId));
    return rows as MappingWithTimestamps[];
  },

  async getSegmentMappingsByAudioFile(audioFileId: number): Promise<MappingWithTimestamps[]> {
    const rows = await db.select({
      mappingId: segmentMappings.id,
      textSegmentId: segmentMappings.textSegmentId,
      mediaSegmentId: segmentMappings.mediaSegmentId,
      audioFileId: mediaSegments.audioFileId,
      startMs: mediaSegments.startMs,
      endMs: mediaSegments.endMs,
      segmentName: mediaSegments.segmentName,
    })
      .from(segmentMappings)
      .leftJoin(mediaSegments, eq(segmentMappings.mediaSegmentId, mediaSegments.id))
      .where(eq(mediaSegments.audioFileId, audioFileId));
    return rows as MappingWithTimestamps[];
  },

  async createMappingWithMediaSegment(data: CreateMappingData): Promise<MappingWithTimestamps> {
    const orgId = await getAudioFileOrgId(data.audioFileId);
    const textSegmentOrgId = await getTextSegmentOrgId(data.textSegmentId);

    if (orgId !== textSegmentOrgId) {
      throw Object.assign(new Error('Audio file and text segment must belong to the same organization'), {
        status: 400,
      });
    }

    const [mediaSeg] = await db.insert(mediaSegments).values({
      orgId,
      audioFileId: data.audioFileId,
      startMs: data.startMs,
      endMs: data.endMs,
      createdBy: data.createdBy,
    }).returning();

    const [map] = await db.insert(segmentMappings).values({
      orgId,
      mediaSegmentId: mediaSeg.id,
      textSegmentId: data.textSegmentId,
      createdBy: data.createdBy,
    }).returning();

    return {
      mappingId: map.id,
      textSegmentId: data.textSegmentId,
      mediaSegmentId: mediaSeg.id,
      audioFileId: data.audioFileId,
      startMs: data.startMs,
      endMs: data.endMs,
    };
  },

  async deleteSegmentMapping(id: number): Promise<void> {
    const rows = await db.select({ mediaSegmentId: segmentMappings.mediaSegmentId })
      .from(segmentMappings)
      .where(eq(segmentMappings.id, id));
    const mediaId = rows[0]?.mediaSegmentId;
    await db.delete(segmentMappings).where(eq(segmentMappings.id, id));
    if (mediaId) await db.delete(mediaSegments).where(eq(mediaSegments.id, mediaId));
  },

  async deleteSegmentMappingByTextSegment(textSegmentId: number, audioFileId: number): Promise<void> {
    const rows = await db.select({ mappingId: segmentMappings.id, mediaSegmentId: segmentMappings.mediaSegmentId })
      .from(segmentMappings)
      .leftJoin(mediaSegments, eq(segmentMappings.mediaSegmentId, mediaSegments.id))
      .where(and(eq(segmentMappings.textSegmentId, textSegmentId), eq(mediaSegments.audioFileId, audioFileId)));
    for (const row of rows) {
      await db.delete(segmentMappings).where(eq(segmentMappings.id, (row as any).mappingId));
      const mediaId = (row as any).mediaSegmentId;
      if (mediaId) await db.delete(mediaSegments).where(eq(mediaSegments.id, mediaId));
    }
  },
};
