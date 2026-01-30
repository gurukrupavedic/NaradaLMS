import { db } from '../../db';
import { audioFiles, mediaSegments, segmentMappings, textSegments } from '@shared/schema';
import { eq, and, asc } from 'drizzle-orm';
import type { AudioFile, MediaSegment, MappingWithTimestamps, CreateAudioFileData, CreateMediaSegmentData, CreateMappingData } from './types';

export const mediaStorage = {
  async getAudioFilesByChapter(chapterId: number): Promise<AudioFile[]> {
    return await db.select().from(audioFiles).where(eq(audioFiles.chapterId, chapterId));
  },

  async createAudioFile(data: CreateAudioFileData): Promise<AudioFile> {
    const [newFile] = await db.insert(audioFiles).values({
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
    return await db.select().from(mediaSegments).where(eq(mediaSegments.audioFileId, audioFileId)).orderBy(asc(mediaSegments.startTimestamp));
  },

  async createMediaSegment(data: CreateMediaSegmentData): Promise<MediaSegment> {
    const [seg] = await db.insert(mediaSegments).values({
      audioFileId: data.audioFileId,
      startTimestamp: data.startTimestamp,
      endTimestamp: data.endTimestamp,
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
      startTime: mediaSegments.startTimestamp,
      endTime: mediaSegments.endTimestamp,
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
      startTime: mediaSegments.startTimestamp,
      endTime: mediaSegments.endTimestamp,
      segmentName: mediaSegments.segmentName,
    })
      .from(segmentMappings)
      .leftJoin(mediaSegments, eq(segmentMappings.mediaSegmentId, mediaSegments.id))
      .where(eq(mediaSegments.audioFileId, audioFileId));
    return rows as MappingWithTimestamps[];
  },

  async createMappingWithMediaSegment(data: CreateMappingData): Promise<MappingWithTimestamps> {
    const [mediaSeg] = await db.insert(mediaSegments).values({
      audioFileId: data.audioFileId,
      startTimestamp: data.startTime,
      endTimestamp: data.endTime,
      createdBy: data.createdBy,
    }).returning();

    const [map] = await db.insert(segmentMappings).values({
      mediaSegmentId: mediaSeg.id,
      textSegmentId: data.textSegmentId,
      createdBy: data.createdBy,
    }).returning();

    return {
      mappingId: map.id,
      textSegmentId: data.textSegmentId,
      mediaSegmentId: mediaSeg.id,
      audioFileId: data.audioFileId,
      startTime: data.startTime,
      endTime: data.endTime,
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
