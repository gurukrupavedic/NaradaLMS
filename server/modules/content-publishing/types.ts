/**
 * Content & Publishing Module Types
 */

export interface Track {
  id: number;
  orgId: string;
  title: string;
  description: string;
  sortOrder: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  chapterCount?: number;
}

export interface Chapter {
  id: number;
  orgId: string;
  trackId: number;
  title: string;
  content: {
    te?: string;
    hi?: string;
    en?: string;
  };
  status: 'draft' | 'published';
  sortOrder: number;
  deletedAt?: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  hasContent?: boolean;
  audioFileCount?: number;
  segmentCount?: number;
}

export interface TextSegment {
  id: number;
  chapterId: number;
  script: 'te' | 'hi' | 'en';
  startPosition: number;
  endPosition: number;
  order: number;
  createdBy: string;
  createdAt: Date;
}

export interface CreateSegmentData {
  chapterId: number;
  script: 'te' | 'hi' | 'en';
  startPosition: number;
  endPosition: number;
  order?: number;
  createdBy: string;
}

export interface SegmentOrderUpdate {
  id: number;
  order: number;
}

export interface CreateTrackData {
  orgId: string;
  title: string;
  description: string;
  createdBy: string;
}

export interface CreateChapterData {
  orgId: string;
  trackId: number;
  title: string;
  content?: {
    te?: string;
    hi?: string;
    en?: string;
  };
  createdBy: string;
}
