/**
 * Learning Delivery Module - Domain Events
 * Event names match system-admin subscriptions for audit logging
 */

export const LEARNING_DELIVERY_EVENTS = {
  CHAPTER_ACCESSED: 'ChapterAccessed',
  PROGRESS_UPDATED: 'ProgressUpdated',
} as const;
