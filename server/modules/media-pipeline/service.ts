import { mediaStorage } from './storage';
import type { CreateAudioFileData, CreateMediaSegmentData, CreateMappingData, MappingWithTimestamps } from './types';
import { db } from '../../db';
import { audioFiles, textSegments } from '@narada/types';
import { eq } from 'drizzle-orm';
import { eventBus } from '../../shared/events/event-bus';
import { MEDIA_EVENTS } from './events';

export const mediaService = {
  async listAudioFilesByChapter(chapterId: number) {
    return await mediaStorage.getAudioFilesByChapter(chapterId);
  },

  async uploadAudioFile(data: CreateAudioFileData) {
    const created = await mediaStorage.createAudioFile(data);
    eventBus.publish(MEDIA_EVENTS.AUDIO_UPLOADED, {
      audioFileId: created.id,
      chapterId: created.chapterId,
      timestamp: new Date().toISOString(),
    });
    return created;
  },

  async updateAudioFile(id: number, update: Partial<CreateAudioFileData>) {
    return await mediaStorage.updateAudioFile(id, update as any);
  },

  async deleteAudioFile(id: number) {
    return await mediaStorage.deleteAudioFile(id);
  },

  async listMediaSegments(audioFileId: number) {
    return await mediaStorage.getMediaSegmentsByAudioFile(audioFileId);
  },

  async createMediaSegment(data: CreateMediaSegmentData) {
    return await mediaStorage.createMediaSegment(data);
  },

  async updateMediaSegment(id: number, update: Partial<CreateMediaSegmentData>) {
    return await mediaStorage.updateMediaSegment(id, update as any);
  },

  async deleteMediaSegment(id: number) {
    return await mediaStorage.deleteMediaSegment(id);
  },

  async listMappingsByChapter(chapterId: number): Promise<MappingWithTimestamps[]> {
    return await mediaStorage.getSegmentMappingsByChapter(chapterId);
  },

  async listMappingsByAudioFile(audioFileId: number): Promise<MappingWithTimestamps[]> {
    return await mediaStorage.getSegmentMappingsByAudioFile(audioFileId);
  },

  async createMapping(data: CreateMappingData): Promise<MappingWithTimestamps> {
    const segRows = await db.select().from(textSegments).where(eq(textSegments.id, data.textSegmentId));
    const audioRows = await db.select().from(audioFiles).where(eq(audioFiles.id, data.audioFileId));
    const seg = segRows[0];
    const af = audioRows[0];
    if (!seg || !af || seg.chapterId !== af.chapterId) {
      throw Object.assign(new Error('Segment and audio file must belong to the same chapter'), { statusCode: 400 });
    }
    if (data.startTime < 0 || data.endTime <= data.startTime) {
      throw Object.assign(new Error('Invalid timestamp range'), { statusCode: 400 });
    }
    const result = await mediaStorage.createMappingWithMediaSegment(data);
    eventBus.publish(MEDIA_EVENTS.MAPPING_CREATED, {
      mappingId: result.mappingId,
      chapterId: seg.chapterId,
      timestamp: new Date().toISOString(),
    });
    return result;
  },

  async deleteMappingById(id: number) {
    return await mediaStorage.deleteSegmentMapping(id);
  },

  async deleteMappingByTextSegment(textSegmentId: number, audioFileId: number) {
    return await mediaStorage.deleteSegmentMappingByTextSegment(textSegmentId, audioFileId);
  },
};
