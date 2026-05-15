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
  async getAudioFilesByChapter(chapterId: number, orgId: string): Promise<AudioFile[]> {
    return await db
      .select()
      .from(audioFiles)
      .where(and(eq(audioFiles.chapterId, chapterId), eq(audioFiles.orgId, orgId)));
  },

  async createAudioFile(data: CreateAudioFileData, orgId: string): Promise<AudioFile> {
    const chapterOrgId = await getChapterOrgId(data.chapterId);

    if (chapterOrgId !== orgId) {
      throw Object.assign(new Error(`Chapter ${data.chapterId} not found`), { status: 404 });
    }

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

  async updateAudioFile(id: number, orgId: string, update: Partial<AudioFile>): Promise<AudioFile> {
    const [updated] = await db
      .update(audioFiles)
      .set(update)
      .where(and(eq(audioFiles.id, id), eq(audioFiles.orgId, orgId)))
      .returning();

    if (!updated) {
      throw Object.assign(new Error(`Audio file ${id} not found`), { status: 404 });
    }

    return updated as AudioFile;
  },

  async deleteAudioFile(id: number, orgId: string): Promise<void> {
    const [deleted] = await db
      .delete(audioFiles)
      .where(and(eq(audioFiles.id, id), eq(audioFiles.orgId, orgId)))
      .returning({ id: audioFiles.id });

    if (!deleted) {
      throw Object.assign(new Error(`Audio file ${id} not found`), { status: 404 });
    }
  },

  async getMediaSegmentsByAudioFile(audioFileId: number, orgId: string): Promise<MediaSegment[]> {
    return await db
      .select()
      .from(mediaSegments)
      .where(and(eq(mediaSegments.audioFileId, audioFileId), eq(mediaSegments.orgId, orgId)))
      .orderBy(asc(mediaSegments.startMs));
  },

  async createMediaSegment(data: CreateMediaSegmentData, orgId: string): Promise<MediaSegment> {
    const audioFileOrgId = await getAudioFileOrgId(data.audioFileId);

    if (audioFileOrgId !== orgId) {
      throw Object.assign(new Error(`Audio file ${data.audioFileId} not found`), { status: 404 });
    }

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

  async updateMediaSegment(id: number, orgId: string, update: Partial<MediaSegment>): Promise<MediaSegment> {
    const [seg] = await db
      .update(mediaSegments)
      .set(update)
      .where(and(eq(mediaSegments.id, id), eq(mediaSegments.orgId, orgId)))
      .returning();

    if (!seg) {
      throw Object.assign(new Error(`Media segment ${id} not found`), { status: 404 });
    }

    return seg as MediaSegment;
  },

  async deleteMediaSegment(id: number, orgId: string): Promise<void> {
    const [deleted] = await db
      .delete(mediaSegments)
      .where(and(eq(mediaSegments.id, id), eq(mediaSegments.orgId, orgId)))
      .returning({ id: mediaSegments.id });

    if (!deleted) {
      throw Object.assign(new Error(`Media segment ${id} not found`), { status: 404 });
    }
  },

  async getSegmentMappingsByChapter(chapterId: number, orgId: string): Promise<MappingWithTimestamps[]> {
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
      .where(
        and(
          eq(textSegments.chapterId, chapterId),
          eq(segmentMappings.orgId, orgId)
        )
      );
    return rows as MappingWithTimestamps[];
  },

  async getSegmentMappingsByAudioFile(audioFileId: number, orgId: string): Promise<MappingWithTimestamps[]> {
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
      .where(
        and(
          eq(mediaSegments.audioFileId, audioFileId),
          eq(segmentMappings.orgId, orgId)
        )
      );
    return rows as MappingWithTimestamps[];
  },

  async createMappingWithMediaSegment(data: CreateMappingData, orgId: string): Promise<MappingWithTimestamps> {
    const audioFileOrgId = await getAudioFileOrgId(data.audioFileId);
    const textSegmentOrgId = await getTextSegmentOrgId(data.textSegmentId);

    if (audioFileOrgId !== textSegmentOrgId || audioFileOrgId !== orgId) {
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

  async deleteSegmentMapping(id: number, orgId: string): Promise<void> {
    const rows = await db.select({ mediaSegmentId: segmentMappings.mediaSegmentId })
      .from(segmentMappings)
      .where(and(eq(segmentMappings.id, id), eq(segmentMappings.orgId, orgId)));
    const mediaId = rows[0]?.mediaSegmentId;
    const [deletedMapping] = await db
      .delete(segmentMappings)
      .where(and(eq(segmentMappings.id, id), eq(segmentMappings.orgId, orgId)))
      .returning({ id: segmentMappings.id });

    if (!deletedMapping) {
      throw Object.assign(new Error(`Mapping ${id} not found`), { status: 404 });
    }

    if (mediaId) {
      await db
        .delete(mediaSegments)
        .where(and(eq(mediaSegments.id, mediaId), eq(mediaSegments.orgId, orgId)));
    }
  },

  async deleteSegmentMappingByTextSegment(
    textSegmentId: number,
    audioFileId: number,
    orgId: string
  ): Promise<void> {
    const rows = await db.select({ mappingId: segmentMappings.id, mediaSegmentId: segmentMappings.mediaSegmentId })
      .from(segmentMappings)
      .leftJoin(mediaSegments, eq(segmentMappings.mediaSegmentId, mediaSegments.id))
      .where(
        and(
          eq(segmentMappings.textSegmentId, textSegmentId),
          eq(mediaSegments.audioFileId, audioFileId),
          eq(segmentMappings.orgId, orgId)
        )
      );
    for (const row of rows) {
      await db
        .delete(segmentMappings)
        .where(and(eq(segmentMappings.id, (row as any).mappingId), eq(segmentMappings.orgId, orgId)));
      const mediaId = (row as any).mediaSegmentId;
      if (mediaId) {
        await db
          .delete(mediaSegments)
          .where(and(eq(mediaSegments.id, mediaId), eq(mediaSegments.orgId, orgId)));
      }
    }
  },
};
