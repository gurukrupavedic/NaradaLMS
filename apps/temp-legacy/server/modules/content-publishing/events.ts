/**
 * Content & Publishing Domain Events
 * References events defined in shared/events/types.ts
 */

export const CONTENT_EVENTS = {
  CHAPTER_PUBLISHED: 'ChapterPublished',
  CHAPTER_UNPUBLISHED: 'ChapterUnpublished',
  CONTENT_UPDATED: 'ContentUpdated',
} as const;
