import { db } from "../../db";
import { tracks, chapters, textSegments, audioFiles, mediaSegments } from "@narada/types";
import { eq, and, asc, sql, max, inArray, isNull } from "drizzle-orm";

function createHttpError(message: string, status: number, code: string, details?: unknown): Error {
  return Object.assign(new Error(message), { status, code, details });
}

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
    const result = await db
      .select({
        id: tracks.id,
        title: tracks.title,
        description: tracks.description,
        sortOrder: tracks.sortOrder,
        createdBy: tracks.createdBy,
        createdAt: tracks.createdAt,
        updatedAt: tracks.updatedAt,
        chapterCount: sql<number>`count(${chapters.id})`.as('chapter_count'),
      })
      .from(tracks)
      .leftJoin(chapters, and(eq(chapters.trackId, tracks.id), isNull(chapters.deletedAt)))
      .groupBy(tracks.id)
      .orderBy(tracks.sortOrder);

    return result.map(row => ({
      ...row,
      chapterCount: Number(row.chapterCount ?? 0),
    }));
  }

  async getTrack(id: number): Promise<any | null> {
    const [track] = await db.select().from(tracks).where(eq(tracks.id, id));
    return track || null;
  }

  async createTrack(track: any): Promise<any> {
    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${tracks.sortOrder}), 0)` })
      .from(tracks);

    const nextOrder = (maxOrderResult[0]?.maxOrder || 0) + 1;

    const [newTrack] = await db.insert(tracks).values({
      ...track,
      sortOrder: nextOrder,
      createdBy: track.createdBy,
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
    const chapterList = await db
      .select()
      .from(chapters)
      .where(and(eq(chapters.trackId, trackId), isNull(chapters.deletedAt)))
      .orderBy(chapters.sortOrder);

    if (chapterList.length === 0) return [];

    const chapterIds = chapterList.map(c => c.id);

    // Bulk query: audio file counts per chapter
    const audioCountResults = await db
      .select({
        chapterId: audioFiles.chapterId,
        audioFileCount: sql<number>`count(*)`.as('audio_file_count'),
      })
      .from(audioFiles)
      .where(inArray(audioFiles.chapterId, chapterIds))
      .groupBy(audioFiles.chapterId);

    const audioCountMap = new Map(
      audioCountResults.map(r => [r.chapterId, Number(r.audioFileCount)])
    );

    // Bulk query: segment counts per chapter (via audioFiles join)
    const segmentCountResults = await db
      .select({
        chapterId: audioFiles.chapterId,
        segmentCount: sql<number>`count(${mediaSegments.id})`.as('segment_count'),
      })
      .from(mediaSegments)
      .innerJoin(audioFiles, eq(mediaSegments.audioFileId, audioFiles.id))
      .where(inArray(audioFiles.chapterId, chapterIds))
      .groupBy(audioFiles.chapterId);

    const segmentCountMap = new Map(
      segmentCountResults.map(r => [r.chapterId, Number(r.segmentCount)])
    );

    return chapterList.map(chapter => {
      const hasContent = Boolean(
        (chapter.content?.te && chapter.content.te.trim().length > 0) ||
        (chapter.content?.hi && chapter.content.hi.trim().length > 0) ||
        (chapter.content?.en && chapter.content.en.trim().length > 0)
      );

      return {
        ...chapter,
        hasContent,
        audioFileCount: audioCountMap.get(chapter.id) ?? 0,
        segmentCount: segmentCountMap.get(chapter.id) ?? 0,
      };
    });
  }

  async getChapter(id: number): Promise<any | null> {
    const result = await db
      .select({
        id: chapters.id,
        trackId: chapters.trackId,
        title: chapters.title,
        sortOrder: chapters.sortOrder,
        status: chapters.status,
        content: chapters.content,
        publishedAt: chapters.publishedAt,
        deletedAt: chapters.deletedAt,
        lastEditedBy: chapters.lastEditedBy,
        createdBy: chapters.createdBy,
        createdAt: chapters.createdAt,
        updatedAt: chapters.updatedAt,
        track: {
          id: tracks.id,
          title: tracks.title,
          sortOrder: tracks.sortOrder,
        }
      })
      .from(chapters)
      .leftJoin(tracks, eq(chapters.trackId, tracks.id))
      .where(and(eq(chapters.id, id), isNull(chapters.deletedAt)));

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
      .select({ maxOrder: sql<number>`COALESCE(MAX(${chapters.sortOrder}), 0)` })
      .from(chapters)
      .where(and(eq(chapters.trackId, chapter.trackId), isNull(chapters.deletedAt)));

    const nextOrder = (maxOrderResult[0]?.maxOrder || 0) + 1;

    const [newChapter] = await db.insert(chapters).values({
      ...chapter,
      sortOrder: nextOrder,
      createdBy: chapter.createdBy,
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
    await db
      .update(chapters)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(chapters.id, id));
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

    return db.transaction(async (tx) => {
      await tx
        .select({ id: textSegments.id })
        .from(textSegments)
        .where(
          and(
            eq(textSegments.chapterId, segment.chapterId),
            eq(textSegments.script, segment.script)
          )
        )
        .for("update");

      const maxOrderResult = await tx
        .select({ maxOrder: max(textSegments.order) })
        .from(textSegments)
        .where(
          and(
            eq(textSegments.chapterId, segment.chapterId),
            eq(textSegments.script, segment.script)
          )
        );

      const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

      const [newSegment] = await tx.insert(textSegments).values({
        chapterId: segment.chapterId,
        script: segment.script,
        startPosition: segment.startPosition,
        endPosition: segment.endPosition,
        order: segment.order !== undefined ? segment.order : nextOrder,
        createdBy: segment.createdBy,
        createdAt: new Date()
      }).returning();

      return newSegment;
    });
  }

  async updateTextSegment(id: number, segmentUpdate: any): Promise<any> {
    if (segmentUpdate.order !== undefined) {
      throw createHttpError(
        "Direct segment order updates are not allowed. Use the reorder endpoint.",
        400,
        "SEGMENT_ORDER_UPDATE_FORBIDDEN"
      );
    }

    const [segment] = await db
      .update(textSegments)
      .set(segmentUpdate)
      .where(eq(textSegments.id, id))
      .returning();
    return segment;
  }

  async updateSegmentOrder(
    chapterId: number,
    script: "te" | "hi" | "en",
    segmentOrders: { id: number; order: number }[]
  ): Promise<void> {
    await db.transaction(async (tx) => {
      const currentSegments = await tx
        .select({
          id: textSegments.id,
          order: textSegments.order,
        })
        .from(textSegments)
        .where(and(eq(textSegments.chapterId, chapterId), eq(textSegments.script, script)))
        .orderBy(asc(textSegments.order), asc(textSegments.id))
        .for("update");

      if (currentSegments.length === 0) {
        throw createHttpError("No segments found for requested chapter and script", 404, "SEGMENTS_NOT_FOUND");
      }

      if (currentSegments.length !== segmentOrders.length) {
        throw createHttpError(
          "segmentOrders must include the full ordered set for the chapter and script",
          400,
          "SEGMENT_ORDERS_MUST_INCLUDE_FULL_SET",
          {
            expected: currentSegments.length,
            received: segmentOrders.length,
          }
        );
      }

      const dbIds = new Set(currentSegments.map((segment) => segment.id));
      const payloadIds = new Set(segmentOrders.map((segment) => segment.id));
      if (dbIds.size !== payloadIds.size || Array.from(dbIds).some((id) => !payloadIds.has(id))) {
        throw createHttpError(
          "segmentOrders ids must match exactly the current chapter/script segments",
          400,
          "SEGMENT_IDS_SCOPE_MISMATCH"
        );
      }

      const maxCurrentOrder = currentSegments.reduce(
        (acc, segment) => Math.max(acc, segment.order),
        -1
      );
      const temporaryOffset = maxCurrentOrder + segmentOrders.length + 1;

      await tx
        .update(textSegments)
        .set({ order: sql`${textSegments.order} + ${temporaryOffset}` })
        .where(and(eq(textSegments.chapterId, chapterId), eq(textSegments.script, script)));

      const caseBranches = segmentOrders.map(({ id, order }) => sql`WHEN ${id} THEN ${order}`);
      await tx.execute(sql`
        UPDATE text_segments
        SET "order" = CASE id
          ${sql.join(caseBranches, sql` `)}
          ELSE "order"
        END
        WHERE chapter_id = ${chapterId}
          AND script = ${script}
      `);
    });
  }

  async deleteTextSegment(id: number): Promise<void> {
    await db.delete(textSegments).where(eq(textSegments.id, id));
  }
  async deleteTextSegmentsByChapter(chapterId: number, script?: string): Promise<void> {
    const whereConditions = script
      ? and(eq(textSegments.chapterId, chapterId), eq(textSegments.script, script))
      : eq(textSegments.chapterId, chapterId);

    await db.delete(textSegments).where(whereConditions);
  }
}

// Export singleton instance
export const contentStorage = new ContentStorage();
