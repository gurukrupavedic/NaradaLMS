import { db } from "../../db";
import { tracks, chapters, textSegments, audioFiles, mediaSegments } from "../../../shared/schema";
import { eq, and, asc, sql, max } from "drizzle-orm";

/**
 * ContentStorage
 * Database access layer for content publishing domain
 * Owns: tracks, chapters, textSegments tables
 */
export class ContentStorage {
  /**
   * Track Operations
   */
  async getAllTracks(): Promise<any[]> {
    const allTracks = await db.select().from(tracks).orderBy(tracks.order);

    const tracksWithCounts = await Promise.all(
      allTracks.map(async (track) => {
        const chapterCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(chapters)
          .where(eq(chapters.trackId, track.id));

        return {
          ...track,
          chapterCount: Number(chapterCount[0]?.count || 0)
        };
      })
    );

    return tracksWithCounts;
  }

  async getTrack(id: number): Promise<any | null> {
    const [track] = await db.select().from(tracks).where(eq(tracks.id, id));
    return track || null;
  }

  async createTrack(track: any): Promise<any> {
    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${tracks.order}), 0)` })
      .from(tracks);

    const nextOrder = (maxOrderResult[0]?.maxOrder || 0) + 1;

    const [newTrack] = await db.insert(tracks).values({
      ...track,
      order: nextOrder,
      createdBy: track.createdBy || "system",
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return newTrack;
  }

  async updateTrack(id: number, trackUpdate: any): Promise<any> {
    const [track] = await db
      .update(tracks)
      .set({ ...trackUpdate, updatedAt: new Date() })
      .where(eq(tracks.id, id))
      .returning();
    return track;
  }

  async deleteTrack(id: number): Promise<void> {
    await db.delete(tracks).where(eq(tracks.id, id));
  }

  /**
   * Chapter Operations
   */
  async getChaptersByTrack(trackId: number): Promise<any[]> {
    const chapterList = await db.select().from(chapters).where(eq(chapters.trackId, trackId)).orderBy(chapters.order);

    const enrichedChapters = await Promise.all(chapterList.map(async (chapter) => {
      const hasContent = Boolean(
        (chapter.content?.te && chapter.content.te.trim().length > 0) ||
        (chapter.content?.hi && chapter.content.hi.trim().length > 0) ||
        (chapter.content?.en && chapter.content.en.trim().length > 0)
      );

      const audioFilesList = await db.select().from(audioFiles).where(eq(audioFiles.chapterId, chapter.id));
      const audioFileCount = audioFilesList.length;

      let segmentCount = 0;
      for (const audioFile of audioFilesList) {
        const mediaSegmentsList = await db.select().from(mediaSegments).where(eq(mediaSegments.audioFileId, audioFile.id));
        segmentCount += mediaSegmentsList.length;
      }

      return {
        ...chapter,
        hasContent,
        audioFileCount,
        segmentCount
      };
    }));

    return enrichedChapters;
  }

  async getChapter(id: number): Promise<any | null> {
    const result = await db
      .select({
        id: chapters.id,
        trackId: chapters.trackId,
        title: chapters.title,
        order: chapters.order,
        status: chapters.status,
        content: chapters.content,
        publishedAt: chapters.publishedAt,
        lastEditedBy: chapters.lastEditedBy,
        createdBy: chapters.createdBy,
        createdAt: chapters.createdAt,
        updatedAt: chapters.updatedAt,
        track: {
          id: tracks.id,
          title: tracks.title,
          order: tracks.order,
        }
      })
      .from(chapters)
      .leftJoin(tracks, eq(chapters.trackId, tracks.id))
      .where(eq(chapters.id, id));

    if (result.length === 0) return null;
    const chapter = result[0];

    if (chapter.content && typeof chapter.content === 'string') {
      try {
        chapter.content = JSON.parse(chapter.content);
      } catch (parseError) {
        console.error('ContentStorage: Failed to parse content JSON:', parseError);
      }
    }

    return chapter;
  }

  async createChapter(chapter: any): Promise<any> {
    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${chapters.order}), 0)` })
      .from(chapters)
      .where(eq(chapters.trackId, chapter.trackId));

    const nextOrder = (maxOrderResult[0]?.maxOrder || 0) + 1;

    const [newChapter] = await db.insert(chapters).values({
      ...chapter,
      order: nextOrder,
      createdBy: chapter.createdBy || "system",
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    return newChapter;
  }

  async updateChapter(id: number, chapterUpdate: any): Promise<any> {
    if (chapterUpdate.content) {
      const [existingChapter] = await db.select().from(chapters).where(eq(chapters.id, id));
      if (existingChapter && existingChapter.content) {
        const existingContent = typeof existingChapter.content === 'string'
          ? JSON.parse(existingChapter.content)
          : existingChapter.content;

        chapterUpdate.content = {
          ...existingContent,
          ...chapterUpdate.content
        };
      }
    }

    const [chapter] = await db
      .update(chapters)
      .set({ ...chapterUpdate, updatedAt: new Date() })
      .where(eq(chapters.id, id))
      .returning();

    return chapter;
  }

  async deleteChapter(id: number): Promise<void> {
    await db.delete(chapters).where(eq(chapters.id, id));
  }

  /**
   * Text Segment Operations
   */
  async getSegmentsByChapter(chapterId: number, script?: string): Promise<any[]> {
    const whereConditions = script
      ? and(eq(textSegments.chapterId, chapterId), eq(textSegments.script, script))
      : eq(textSegments.chapterId, chapterId);

    return await db.select().from(textSegments).where(whereConditions).orderBy(asc(textSegments.order));
  }

  async createTextSegment(segment: any): Promise<any> {
    if (!segment.chapterId || !segment.script ||
      segment.startPosition === undefined || segment.endPosition === undefined) {
      throw new Error("Missing required fields: chapterId, script, startPosition, endPosition");
    }

    const maxOrderResult = await db
      .select({ maxOrder: max(textSegments.order) })
      .from(textSegments)
      .where(
        and(
          eq(textSegments.chapterId, segment.chapterId),
          eq(textSegments.script, segment.script)
        )
      );

    const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

    const [newSegment] = await db.insert(textSegments).values({
      chapterId: segment.chapterId,
      script: segment.script,
      startPosition: segment.startPosition,
      endPosition: segment.endPosition,
      order: segment.order !== undefined ? segment.order : nextOrder,
      createdBy: segment.createdBy || "system",
      createdAt: new Date()
    }).returning();
    return newSegment;
  }

  async updateTextSegment(id: number, segmentUpdate: any): Promise<any> {
    const [segment] = await db
      .update(textSegments)
      .set(segmentUpdate)
      .where(eq(textSegments.id, id))
      .returning();
    return segment;
  }

  async updateSegmentOrder(chapterId: number, segmentOrders: { id: number; order: number }[]): Promise<void> {
    for (const { id, order } of segmentOrders) {
      await db
        .update(textSegments)
        .set({ order })
        .where(eq(textSegments.id, id))
        .returning();
    }
  }

  async deleteTextSegment(id: number): Promise<void> {
    await db.delete(textSegments).where(eq(textSegments.id, id));
  }
}

// Export singleton instance
export const contentStorage = new ContentStorage();
