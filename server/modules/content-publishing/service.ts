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
import { eq } from "drizzle-orm";
import { tracks, chapters } from "@narada/types";

export class ContentService {
  constructor(
    private storage: typeof contentStorage,
    private eventBus: EventBus
  ) { }

  /**
   * Track Operations
   */
  async getTrack(trackId: number): Promise<Track | null> {
    return await this.storage.getTrack(trackId);
  }

  async listTracks(): Promise<Track[]> {
    return await this.storage.getAllTracks();
  }

  async createTrack(data: CreateTrackData): Promise<Track> {
    const track = await this.storage.createTrack({
      title: data.title,
      description: data.description,
      createdBy: data.createdBy || "system"
    });
    return track;
  }

  async updateTrack(trackId: number, data: Partial<Track>): Promise<Track> {
    const track = await this.storage.updateTrack(trackId, data);
    return track;
  }

  async deleteTrack(trackId: number): Promise<void> {
    await this.storage.deleteTrack(trackId);
  }

  /**
   * Reorder tracks by swapping order values.
   * 
   * Current implementation swaps with adjacent track.
   * TODO: Consider "move to position" logic if drag-and-drop becomes complex.
   */
  async moveTrack(trackId: number, direction: 'up' | 'down'): Promise<void> {
    const allTracks = await this.storage.getAllTracks();
    const sortedTracks = allTracks.sort((a, b) => a.order - b.order);
    const currentIndex = sortedTracks.findIndex(t => t.id === trackId);

    if (currentIndex === -1) {
      throw new Error("Track not found");
    }

    if (direction === 'up' && currentIndex > 0) {
      const previousTrack = sortedTracks[currentIndex - 1];
      const currentTrack = sortedTracks[currentIndex];
      await db.transaction(async (tx) => {
        await tx.update(tracks).set({ order: previousTrack.order, updatedAt: new Date() }).where(eq(tracks.id, trackId));
        await tx.update(tracks).set({ order: currentTrack.order, updatedAt: new Date() }).where(eq(tracks.id, previousTrack.id));
      });
    } else if (direction === 'down' && currentIndex < sortedTracks.length - 1) {
      const nextTrack = sortedTracks[currentIndex + 1];
      const currentTrack = sortedTracks[currentIndex];
      await db.transaction(async (tx) => {
        await tx.update(tracks).set({ order: nextTrack.order, updatedAt: new Date() }).where(eq(tracks.id, trackId));
        await tx.update(tracks).set({ order: currentTrack.order, updatedAt: new Date() }).where(eq(tracks.id, nextTrack.id));
      });
    } else {
      throw new Error("Cannot move track in that direction");
    }
  }

  /**
   * Chapter Operations
   */
  async getChapter(chapterId: number): Promise<Chapter | null> {
    return await this.storage.getChapter(chapterId);
  }

  async getChaptersByTrack(trackId: number): Promise<Chapter[]> {
    return await this.storage.getChaptersByTrack(trackId);
  }

  async getPublishedChapters(): Promise<Chapter[]> {
    const allTracks = await this.storage.getAllTracks();
    const allChapters: Chapter[] = [];

    for (const track of allTracks) {
      const trackChapters = await this.storage.getChaptersByTrack(track.id);
      const publishedChapters = trackChapters.filter(c => c.status === 'published');
      allChapters.push(...publishedChapters);
    }

    return allChapters;
  }

  async createChapter(data: CreateChapterData): Promise<Chapter> {
    const chapter = await this.storage.createChapter({
      trackId: data.trackId,
      title: data.title,
      content: data.content || { te: '', hi: '', en: '' },
      status: 'draft',
      createdBy: data.createdBy || "system"
    });
    return chapter;
  }

  async updateChapterContent(chapterId: number, content: object): Promise<Chapter> {
    const chapter = await this.storage.updateChapter(chapterId, { content });

    await this.eventBus.publish(CONTENT_EVENTS.CONTENT_UPDATED, {
      type: 'ContentUpdated',
      chapterId,
      timestamp: new Date()
    });

    return chapter;
  }

  async updateChapter(chapterId: number, data: Partial<Chapter>): Promise<Chapter> {
    const chapter = await this.storage.updateChapter(chapterId, data);

    if (data.content) {
      await this.eventBus.publish(CONTENT_EVENTS.CONTENT_UPDATED, {
        type: 'ContentUpdated',
        chapterId,
        timestamp: new Date()
      });
    }

    return chapter;
  }

  /**
   * Publishes a chapter, making it visible to students.
   * - Updates status to 'published'
   * - Emits CHAPTER_PUBLISHED event
   */
  async publishChapter(chapterId: number, userId: string): Promise<Chapter> {
    const chapter = await this.storage.updateChapter(chapterId, { status: 'published' });

    await this.eventBus.publish(CONTENT_EVENTS.CHAPTER_PUBLISHED, {
      type: 'ChapterPublished',
      chapterId,
      publishedBy: userId,
      timestamp: new Date()
    });

    return chapter;
  }

  async unpublishChapter(chapterId: number, userId: string): Promise<Chapter> {
    const chapter = await this.storage.updateChapter(chapterId, { status: 'draft' });

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
  async deleteChapter(chapterId: number): Promise<void> {
    const chapter = await this.storage.getChapter(chapterId);

    if (!chapter) {
      throw new Error("Chapter not found");
    }

    if (chapter.status === 'published') {
      throw new Error("Cannot delete a published chapter. Unpublish it first.");
    }

    await this.storage.deleteChapter(chapterId);
  }

  async moveChapter(chapterId: number, direction: 'up' | 'down'): Promise<void> {
    const chapter = await this.storage.getChapter(chapterId);

    if (!chapter) {
      throw new Error("Chapter not found");
    }

    const chapterList = await this.storage.getChaptersByTrack(chapter.trackId);
    const sortedChapters = chapterList.sort((a, b) => a.order - b.order);
    const currentIndex = sortedChapters.findIndex(c => c.id === chapterId);

    if (currentIndex === -1) {
      throw new Error("Chapter not found in track");
    }

    if (direction === 'up' && currentIndex > 0) {
      const previousChapter = sortedChapters[currentIndex - 1];
      const currentChapter = sortedChapters[currentIndex];
      await db.transaction(async (tx) => {
        await tx.update(chapters).set({ order: previousChapter.order, updatedAt: new Date() }).where(eq(chapters.id, chapterId));
        await tx.update(chapters).set({ order: currentChapter.order, updatedAt: new Date() }).where(eq(chapters.id, previousChapter.id));
      });
    } else if (direction === 'down' && currentIndex < sortedChapters.length - 1) {
      const nextChapter = sortedChapters[currentIndex + 1];
      const currentChapter = sortedChapters[currentIndex];
      await db.transaction(async (tx) => {
        await tx.update(chapters).set({ order: nextChapter.order, updatedAt: new Date() }).where(eq(chapters.id, chapterId));
        await tx.update(chapters).set({ order: currentChapter.order, updatedAt: new Date() }).where(eq(chapters.id, nextChapter.id));
      });
    } else {
      throw new Error("Cannot move chapter in that direction");
    }
  }

  async moveChapterToTrack(chapterId: number, toTrackId: number): Promise<void> {
    const chapter = await this.storage.getChapter(chapterId);
    if (!chapter) throw new Error('Chapter not found');

    const targetChapters = await this.storage.getChaptersByTrack(toTrackId);
    const maxOrder = targetChapters.reduce((acc, c) => Math.max(acc, c.order ?? 0), 0);
    const nextOrder = (maxOrder || 0) + 1;

    await this.storage.updateChapter(chapterId, { trackId: toTrackId, order: nextOrder });
  }

  /**
   * Text Segment Operations
   */
  async getSegmentsByChapter(chapterId: number, script?: 'te' | 'hi' | 'en'): Promise<TextSegment[]> {
    return await this.storage.getSegmentsByChapter(chapterId, script);
  }

  async createSegment(data: CreateSegmentData): Promise<TextSegment> {
    const segment = await this.storage.createTextSegment({
      chapterId: data.chapterId,
      script: data.script,
      startPosition: data.startPosition,
      endPosition: data.endPosition,
      order: data.order,
      createdBy: data.createdBy || "system"
    });
    return segment;
  }

  async updateSegment(segmentId: number, data: Partial<TextSegment>): Promise<TextSegment> {
    const segment = await this.storage.updateTextSegment(segmentId, data);
    return segment;
  }

  async deleteSegment(segmentId: number): Promise<void> {
    await this.storage.deleteTextSegment(segmentId);
  }

  async reorderSegments(chapterId: number, segmentOrders: Array<{ id: number; order: number }>): Promise<void> {
    await this.storage.updateSegmentOrder(chapterId, segmentOrders);
  }

  async deleteSegmentsByChapter(chapterId: number, script: 'te' | 'hi' | 'en'): Promise<void> {
    await this.storage.deleteTextSegmentsByChapter(chapterId, script);
  }
}

// Export singleton instance
import { eventBus } from "../../shared/events/event-bus";
export const contentService = new ContentService(contentStorage, eventBus);
