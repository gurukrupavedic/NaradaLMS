import { mediaStorage } from './storage';
import type { CreateAudioFileData, CreateMediaSegmentData, CreateMappingData, MappingWithTimestamps } from './types';
import { db } from '../../db';
import { audioFiles, textSegments } from '@narada/types';
import { eq } from 'drizzle-orm';

export const mediaService = {
  async listAudioFilesByChapter(chapterId: number) {
    return await mediaStorage.getAudioFilesByChapter(chapterId);
  },

  async uploadAudioFile(data: CreateAudioFileData) {
    return await mediaStorage.createAudioFile(data);
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
    return await mediaStorage.createMappingWithMediaSegment(data);
  },

  async deleteMappingById(id: number) {
    return await mediaStorage.deleteSegmentMapping(id);
  },

  async deleteMappingByTextSegment(textSegmentId: number, audioFileId: number) {
    return await mediaStorage.deleteSegmentMappingByTextSegment(textSegmentId, audioFileId);
  },
};
