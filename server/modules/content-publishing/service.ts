/**
 * Content & Publishing Module - Tracks, chapters, and text segments
 * 
 * Responsibilities:
 * - Track creation and management
 * - Chapter creation, editing, publishing
 * - Text segment management
 */

import { contentStorage } from "./storage";
import { EventBus } from "../../shared/events/event-bus";
import { CONTENT_EVENTS } from "./events";
import type { Track, Chapter, TextSegment, CreateSegmentData, CreateTrackData, CreateChapterData } from "./types";
import { db } from "../../db";
import { and, eq } from "drizzle-orm";
import { tracks, chapters } from "@narada/types";
import {
  getPostgresConstraintName,
  isPostgresUniqueViolation,
} from "../../shared/utils/postgres-unique-violation";

const CHAPTER_TRACK_TITLE_UNIQ = "chapters_track_title_uniq";
const TEXT_SEGMENTS_CHAPTER_SCRIPT_ORDER_UNIQ = "text_segments_chapter_script_order_uniq";

function createHttpError(message: string, status: number, code: string, details?: unknown): Error {
  return Object.assign(new Error(message), { status, code, details });
}

function throwIfChapterTitleConflict(error: unknown): void {
  if (
    isPostgresUniqueViolation(error) &&
    getPostgresConstraintName(error) === CHAPTER_TRACK_TITLE_UNIQ
  ) {
    throw Object.assign(
      new Error("A chapter with this title already exists in this track"),
      { status: 409, code: "CHAPTER_TITLE_CONFLICT" }
    );
  }
}

function throwIfSegmentOrderConflict(error: unknown): void {
  if (
    isPostgresUniqueViolation(error) &&
    getPostgresConstraintName(error) === TEXT_SEGMENTS_CHAPTER_SCRIPT_ORDER_UNIQ
  ) {
    throw createHttpError(
      "Segment order conflict detected. Refresh and retry.",
      409,
      "SEGMENT_ORDER_CONFLICT"
    );
  }
}

export class ContentService {
  constructor(
    private storage: typeof contentStorage,
    private eventBus: EventBus
  ) { }

  /**
   * Track Operations
   */
  async getTrack(trackId: number, orgId: string): Promise<Track | null> {
    return await this.storage.getTrack(trackId, orgId);
  }

  async listTracks(orgId: string): Promise<Track[]> {
    return await this.storage.getAllTracks(orgId);
  }

  async createTrack(data: CreateTrackData): Promise<Track> {
    const track = await this.storage.createTrack({
      orgId: data.orgId,
      title: data.title,
      description: data.description,
      createdBy: data.createdBy
    });
    return track;
  }

  async updateTrack(trackId: number, orgId: string, data: Partial<Track>): Promise<Track> {
    const track = await this.storage.updateTrack(trackId, orgId, data);
    return track;
  }

  async deleteTrack(trackId: number, orgId: string): Promise<void> {
    await this.storage.deleteTrack(trackId, orgId);
  }

  /**
   * Reorder tracks by swapping order values.
   * 
   * Current implementation swaps with adjacent track.
   * TODO: Consider "move to position" logic if drag-and-drop becomes complex.
   */
  async moveTrack(trackId: number, orgId: string, direction: 'up' | 'down'): Promise<void> {
    const allTracks = await this.storage.getAllTracks(orgId);
    const sortedTracks = allTracks.sort((a, b) => a.sortOrder - b.sortOrder);
    const currentIndex = sortedTracks.findIndex(t => t.id === trackId);

    if (currentIndex === -1) {
      throw new Error("Track not found");
    }

    if (direction === 'up' && currentIndex > 0) {
      const previousTrack = sortedTracks[currentIndex - 1];
      const currentTrack = sortedTracks[currentIndex];
      await db.transaction(async (tx) => {
        await tx
          .update(tracks)
          .set({ sortOrder: previousTrack.sortOrder, updatedAt: new Date() })
          .where(and(eq(tracks.id, trackId), eq(tracks.orgId, orgId)));
        await tx
          .update(tracks)
          .set({ sortOrder: currentTrack.sortOrder, updatedAt: new Date() })
          .where(and(eq(tracks.id, previousTrack.id), eq(tracks.orgId, orgId)));
      });
    } else if (direction === 'down' && currentIndex < sortedTracks.length - 1) {
      const nextTrack = sortedTracks[currentIndex + 1];
      const currentTrack = sortedTracks[currentIndex];
      await db.transaction(async (tx) => {
        await tx
          .update(tracks)
          .set({ sortOrder: nextTrack.sortOrder, updatedAt: new Date() })
          .where(and(eq(tracks.id, trackId), eq(tracks.orgId, orgId)));
        await tx
          .update(tracks)
          .set({ sortOrder: currentTrack.sortOrder, updatedAt: new Date() })
          .where(and(eq(tracks.id, nextTrack.id), eq(tracks.orgId, orgId)));
      });
    } else {
      throw new Error("Cannot move track in that direction");
    }
  }

  /**
   * Chapter Operations
   */
  async getChapter(chapterId: number, orgId: string): Promise<Chapter | null> {
    return await this.storage.getChapter(chapterId, orgId);
  }

  async getChaptersByTrack(trackId: number, orgId: string): Promise<Chapter[]> {
    return await this.storage.getChaptersByTrack(trackId, orgId);
  }

  async getPublishedChapters(orgId: string): Promise<Chapter[]> {
    const allTracks = await this.storage.getAllTracks(orgId);
    const allChapters: Chapter[] = [];

    for (const track of allTracks) {
      const trackChapters = await this.storage.getChaptersByTrack(track.id, orgId);
      const publishedChapters = trackChapters.filter(c => c.status === 'published');
      allChapters.push(...publishedChapters);
    }

    return allChapters;
  }

  async createChapter(data: CreateChapterData): Promise<Chapter> {
    try {
      const chapter = await this.storage.createChapter({
        orgId: data.orgId,
        trackId: data.trackId,
        title: data.title,
        content: data.content || { te: '', hi: '', en: '' },
        status: 'draft',
        createdBy: data.createdBy
      });
      return chapter;
    } catch (e) {
      throwIfChapterTitleConflict(e);
      throw e;
    }
  }

  async updateChapterContent(chapterId: number, orgId: string, content: object): Promise<Chapter> {
    const chapter = await this.storage.updateChapter(chapterId, orgId, { content });

    await this.eventBus.publish(CONTENT_EVENTS.CONTENT_UPDATED, {
      type: 'ContentUpdated',
      chapterId,
      timestamp: new Date()
    });

    return chapter;
  }

  async updateChapter(chapterId: number, orgId: string, data: Partial<Chapter>): Promise<Chapter> {
    try {
      const chapter = await this.storage.updateChapter(chapterId, orgId, data);

      if (data.content) {
        await this.eventBus.publish(CONTENT_EVENTS.CONTENT_UPDATED, {
          type: 'ContentUpdated',
          chapterId,
          timestamp: new Date()
        });
      }

      return chapter;
    } catch (e) {
      throwIfChapterTitleConflict(e);
      throw e;
    }
  }

  /**
   * Publishes a chapter, making it visible to students.
   * - Updates status to 'published'
   * - Emits CHAPTER_PUBLISHED event
   */
  async publishChapter(chapterId: number, orgId: string, userId: string): Promise<Chapter> {
    const chapter = await this.storage.updateChapter(chapterId, orgId, { status: 'published' });

    await this.eventBus.publish(CONTENT_EVENTS.CHAPTER_PUBLISHED, {
      type: 'ChapterPublished',
      chapterId,
      publishedBy: userId,
      timestamp: new Date()
    });

    return chapter;
  }

  async unpublishChapter(chapterId: number, orgId: string, userId: string): Promise<Chapter> {
    const chapter = await this.storage.updateChapter(chapterId, orgId, { status: 'draft' });

    await this.eventBus.publish(CONTENT_EVENTS.CHAPTER_UNPUBLISHED, {
      type: 'ChapterUnpublished',
      chapterId,
      unpublishedBy: userId,
      timestamp: new Date()
    });

    return chapter;
  }

  /**
   * Delete a chapter.
   * 
   * @domain_invariant Published content CANNOT be deleted. using soft-delete or 
   * unpublish-then-delete is required to prevent data integrity issues for students.
   */
  async deleteChapter(chapterId: number, orgId: string): Promise<void> {
    const chapter = await this.storage.getChapter(chapterId, orgId);

    if (!chapter) {
      throw new Error("Chapter not found");
    }

    if (chapter.status === 'published') {
      throw new Error("Cannot delete a published chapter. Unpublish it first.");
    }

    await this.storage.deleteChapter(chapterId, orgId);
  }

  async moveChapter(chapterId: number, orgId: string, direction: 'up' | 'down'): Promise<void> {
    const chapter = await this.storage.getChapter(chapterId, orgId);

    if (!chapter) {
      throw new Error("Chapter not found");
    }

    const chapterList = await this.storage.getChaptersByTrack(chapter.trackId, orgId);
    const sortedChapters = chapterList.sort((a, b) => a.sortOrder - b.sortOrder);
    const currentIndex = sortedChapters.findIndex(c => c.id === chapterId);

    if (currentIndex === -1) {
      throw new Error("Chapter not found in track");
    }

    if (direction === 'up' && currentIndex > 0) {
      const previousChapter = sortedChapters[currentIndex - 1];
      const currentChapter = sortedChapters[currentIndex];
      await db.transaction(async (tx) => {
        await tx
          .update(chapters)
          .set({ sortOrder: previousChapter.sortOrder, updatedAt: new Date() })
          .where(and(eq(chapters.id, chapterId), eq(chapters.orgId, orgId)));
        await tx
          .update(chapters)
          .set({ sortOrder: currentChapter.sortOrder, updatedAt: new Date() })
          .where(and(eq(chapters.id, previousChapter.id), eq(chapters.orgId, orgId)));
      });
    } else if (direction === 'down' && currentIndex < sortedChapters.length - 1) {
      const nextChapter = sortedChapters[currentIndex + 1];
      const currentChapter = sortedChapters[currentIndex];
      await db.transaction(async (tx) => {
        await tx
          .update(chapters)
          .set({ sortOrder: nextChapter.sortOrder, updatedAt: new Date() })
          .where(and(eq(chapters.id, chapterId), eq(chapters.orgId, orgId)));
        await tx
          .update(chapters)
          .set({ sortOrder: currentChapter.sortOrder, updatedAt: new Date() })
          .where(and(eq(chapters.id, nextChapter.id), eq(chapters.orgId, orgId)));
      });
    } else {
      throw new Error("Cannot move chapter in that direction");
    }
  }

  async moveChapterToTrack(chapterId: number, orgId: string, toTrackId: number): Promise<void> {
    const chapter = await this.storage.getChapter(chapterId, orgId);
    if (!chapter) throw new Error('Chapter not found');

    const targetChapters = await this.storage.getChaptersByTrack(toTrackId, orgId);
    const maxOrder = targetChapters.reduce((acc, c) => Math.max(acc, c.sortOrder ?? 0), 0);
    const nextOrder = (maxOrder || 0) + 1;

    try {
      await this.storage.updateChapter(chapterId, orgId, { trackId: toTrackId, sortOrder: nextOrder });
    } catch (e) {
      throwIfChapterTitleConflict(e);
      throw e;
    }
  }

  /**
   * Text Segment Operations
   */
  async getSegmentsByChapter(
    chapterId: number,
    script: 'te' | 'hi' | 'en' | undefined,
    orgId: string
  ): Promise<TextSegment[]> {
    return await this.storage.getSegmentsByChapter(chapterId, script, orgId);
  }

  async createSegment(data: CreateSegmentData, orgId: string): Promise<TextSegment> {
    try {
      const segment = await this.storage.createTextSegment(
        {
          chapterId: data.chapterId,
          script: data.script,
          startPosition: data.startPosition,
          endPosition: data.endPosition,
          order: data.order,
          createdBy: data.createdBy
        },
        orgId
      );
      return segment;
    } catch (e) {
      throwIfSegmentOrderConflict(e);
      throw e;
    }
  }

  async updateSegment(
    orgId: string,
    segmentId: number,
    data: Partial<TextSegment>
  ): Promise<TextSegment> {
    try {
      const segment = await this.storage.updateTextSegment(segmentId, orgId, data);
      return segment;
    } catch (e) {
      throwIfSegmentOrderConflict(e);
      throw e;
    }
  }

  async deleteSegment(orgId: string, segmentId: number): Promise<void> {
    await this.storage.deleteTextSegment(segmentId, orgId);
  }

  async reorderSegments(
    chapterId: number,
    orgId: string,
    script: "te" | "hi" | "en",
    segmentOrders: Array<{ id: number; order: number }>
  ): Promise<void> {
    if (!["te", "hi", "en"].includes(script)) {
      throw createHttpError("Invalid script. Must be 'te', 'hi', or 'en'", 400, "INVALID_SCRIPT");
    }

    if (segmentOrders.length === 0) {
      throw createHttpError("segmentOrders must include all script segments", 400, "EMPTY_SEGMENT_ORDERS");
    }

    const idSet = new Set<number>();
    const orderSet = new Set<number>();
    for (const item of segmentOrders) {
      if (!Number.isInteger(item.id) || item.id <= 0 || !Number.isInteger(item.order) || item.order < 0) {
        throw createHttpError(
          "Each segmentOrders item requires positive integer id and non-negative integer order",
          400,
          "INVALID_SEGMENT_ORDER_ITEM"
        );
      }
      if (idSet.has(item.id)) {
        throw createHttpError("segmentOrders cannot include duplicate ids", 400, "DUPLICATE_SEGMENT_ID");
      }
      if (orderSet.has(item.order)) {
        throw createHttpError("segmentOrders cannot include duplicate order values", 400, "DUPLICATE_SEGMENT_ORDER");
      }
      idSet.add(item.id);
      orderSet.add(item.order);
    }

    const expectedOrders = Array.from(orderSet).sort((a, b) => a - b);
    for (let i = 0; i < expectedOrders.length; i += 1) {
      if (expectedOrders[i] !== i) {
        throw createHttpError(
          "segmentOrders must be contiguous starting at 0",
          400,
          "INVALID_SEGMENT_ORDER_SEQUENCE"
        );
      }
    }

    try {
      await this.storage.updateSegmentOrder(chapterId, script, orgId, segmentOrders);
    } catch (e) {
      throwIfSegmentOrderConflict(e);
      throw e;
    }
  }

  async deleteSegmentsByChapter(
    chapterId: number,
    orgId: string,
    script: 'te' | 'hi' | 'en'
  ): Promise<void> {
    await this.storage.deleteTextSegmentsByChapter(chapterId, orgId, script);
  }
}

// Export singleton instance
import { eventBus } from "../../shared/events/event-bus";
export const contentService = new ContentService(contentStorage, eventBus);
