import { mediaStorage } from './storage';
import type { CreateAudioFileData, CreateMediaSegmentData, CreateMappingData, MappingWithTimestamps } from './types';
import { db } from '../../db';
import { audioFiles, textSegments } from '@narada/types';
import { eq } from 'drizzle-orm';
import { eventBus } from '../../shared/events/event-bus';
import { MEDIA_EVENTS } from './events';

export const mediaService = {
  async listAudioFilesByChapter(chapterId: number, orgId: string) {
    return await mediaStorage.getAudioFilesByChapter(chapterId, orgId);
  },

  async uploadAudioFile(data: CreateAudioFileData, orgId: string) {
    const created = await mediaStorage.createAudioFile(data, orgId);
    eventBus.publish(MEDIA_EVENTS.AUDIO_UPLOADED, {
      audioFileId: created.id,
      chapterId: created.chapterId,
      timestamp: new Date().toISOString(),
    });
    return created;
  },

  async updateAudioFile(id: number, orgId: string, update: Partial<CreateAudioFileData>) {
    return await mediaStorage.updateAudioFile(id, orgId, update as any);
  },

  async deleteAudioFile(id: number, orgId: string) {
    return await mediaStorage.deleteAudioFile(id, orgId);
  },

  async listMediaSegments(audioFileId: number, orgId: string) {
    return await mediaStorage.getMediaSegmentsByAudioFile(audioFileId, orgId);
  },

  async createMediaSegment(data: CreateMediaSegmentData, orgId: string) {
    return await mediaStorage.createMediaSegment(data, orgId);
  },

  async updateMediaSegment(id: number, orgId: string, update: Partial<CreateMediaSegmentData>) {
    return await mediaStorage.updateMediaSegment(id, orgId, update as any);
  },

  async deleteMediaSegment(id: number, orgId: string) {
    return await mediaStorage.deleteMediaSegment(id, orgId);
  },

  async listMappingsByChapter(chapterId: number, orgId: string): Promise<MappingWithTimestamps[]> {
    return await mediaStorage.getSegmentMappingsByChapter(chapterId, orgId);
  },

  async listMappingsByAudioFile(audioFileId: number, orgId: string): Promise<MappingWithTimestamps[]> {
    return await mediaStorage.getSegmentMappingsByAudioFile(audioFileId, orgId);
  },

  async createMapping(data: CreateMappingData, orgId: string): Promise<MappingWithTimestamps> {
    const segRows = await db.select().from(textSegments).where(eq(textSegments.id, data.textSegmentId));
    const audioRows = await db.select().from(audioFiles).where(eq(audioFiles.id, data.audioFileId));
    const seg = segRows[0];
    const af = audioRows[0];
    if (!seg || !af || seg.chapterId !== af.chapterId || seg.orgId !== orgId || af.orgId !== orgId) {
      throw Object.assign(new Error('Segment and audio file must belong to the same chapter'), { statusCode: 400 });
    }
    if (!Number.isInteger(data.startMs) || !Number.isInteger(data.endMs)) {
      throw Object.assign(new Error('startMs and endMs must be integer milliseconds'), { statusCode: 400 });
    }
    if (data.startMs < 0 || data.endMs <= data.startMs) {
      throw Object.assign(new Error('Invalid timestamp range'), { statusCode: 400 });
    }
    const result = await mediaStorage.createMappingWithMediaSegment(data, orgId);
    eventBus.publish(MEDIA_EVENTS.MAPPING_CREATED, {
      mappingId: result.mappingId,
      chapterId: seg.chapterId,
      timestamp: new Date().toISOString(),
    });
    return result;
  },

  async deleteMappingById(id: number, orgId: string) {
    return await mediaStorage.deleteSegmentMapping(id, orgId);
  },

  async deleteMappingByTextSegment(textSegmentId: number, audioFileId: number, orgId: string) {
    return await mediaStorage.deleteSegmentMappingByTextSegment(textSegmentId, audioFileId, orgId);
  },
};
