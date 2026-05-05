/**
 * Content & Publishing Module Types
 */

export interface Track {
  id: number;
  title: string;
  description: string;
  order: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  chapterCount?: number;
}

export interface Chapter {
  id: number;
  trackId: number;
  title: string;
  content: {
    te?: string;
    hi?: string;
    en?: string;
  };
  status: 'draft' | 'published';
  order: number;
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

export interface CreateTrackData {
  title: string;
  description: string;
  createdBy: string;
}

export interface CreateChapterData {
  trackId: number;
  title: string;
  content?: {
    te?: string;
    hi?: string;
    en?: string;
  };
  createdBy: string;
}
