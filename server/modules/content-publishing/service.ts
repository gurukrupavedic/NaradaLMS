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

export class ContentService {
  constructor(
    private storage: typeof contentStorage,
    private eventBus: EventBus
  ) {}

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

  async moveTrack(trackId: number, direction: 'up' | 'down'): Promise<void> {
    const tracks = await this.storage.getAllTracks();
    const sortedTracks = tracks.sort((a, b) => a.order - b.order);
    const currentIndex = sortedTracks.findIndex(t => t.id === trackId);
    
    if (currentIndex === -1) {
      throw new Error("Track not found");
    }
    
    if (direction === 'up' && currentIndex > 0) {
      const previousTrack = sortedTracks[currentIndex - 1];
      const currentTrack = sortedTracks[currentIndex];
      await this.storage.updateTrack(trackId, { order: previousTrack.order });
      await this.storage.updateTrack(previousTrack.id, { order: currentTrack.order });
    } else if (direction === 'down' && currentIndex < sortedTracks.length - 1) {
      const nextTrack = sortedTracks[currentIndex + 1];
      const currentTrack = sortedTracks[currentIndex];
      await this.storage.updateTrack(trackId, { order: nextTrack.order });
      await this.storage.updateTrack(nextTrack.id, { order: currentTrack.order });
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
      const chapters = await this.storage.getChaptersByTrack(track.id);
      const publishedChapters = chapters.filter(c => c.status === 'published');
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
    
    const chapters = await this.storage.getChaptersByTrack(chapter.trackId);
    const sortedChapters = chapters.sort((a, b) => a.order - b.order);
    const currentIndex = sortedChapters.findIndex(c => c.id === chapterId);
    
    if (currentIndex === -1) {
      throw new Error("Chapter not found in track");
    }
    
    if (direction === 'up' && currentIndex > 0) {
      const previousChapter = sortedChapters[currentIndex - 1];
      const currentChapter = sortedChapters[currentIndex];
      await this.storage.updateChapter(chapterId, { order: previousChapter.order });
      await this.storage.updateChapter(previousChapter.id, { order: currentChapter.order });
    } else if (direction === 'down' && currentIndex < sortedChapters.length - 1) {
      const nextChapter = sortedChapters[currentIndex + 1];
      const currentChapter = sortedChapters[currentIndex];
      await this.storage.updateChapter(chapterId, { order: nextChapter.order });
      await this.storage.updateChapter(nextChapter.id, { order: currentChapter.order });
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
}

// Export singleton instance
import { eventBus } from "../../shared/events/event-bus";
export const contentService = new ContentService(contentStorage, eventBus);
