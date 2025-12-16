/**
 * EventBus - Simple in-process event system for cross-module communication
 * 
 * Modules emit events, other modules subscribe and react
 * Keeps modules loosely coupled
 */

type EventHandler<T> = (event: T) => Promise<void> | void;

export class EventBus {
  private handlers: Map<string, EventHandler<any>[]> = new Map();

  /**
   * Subscribe to an event type
   */
  subscribe<T>(eventType: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  /**
   * Publish an event - calls all subscribers
   */
  async publish<T>(eventType: string, event: T): Promise<void> {
    const handlers = this.handlers.get(eventType) || [];
    // Run all handlers in parallel, but don't fail if one fails
    await Promise.allSettled(
      handlers.map(h => Promise.resolve(h(event)))
    );
  }

  /**
   * Clear all subscribers (useful for testing)
   */
  clear(): void {
    this.handlers.clear();
  }
}

// Singleton instance
export const eventBus = new EventBus();

/**
 * Domain Event Types - All possible events in the system
 */
export type DomainEvent =
  // User events
  | { type: 'UserApproved'; userId: string; approvedBy: string }
  | { type: 'UserDisabled'; userId: string }
  | { type: 'UserEnabled'; userId: string }
  | { type: 'RoleAssigned'; userId: string; role: string }
  | { type: 'RoleRemoved'; userId: string; role: string }
  // Content events
  | { type: 'TrackCreated'; trackId: number; createdBy: string }
  | { type: 'ChapterCreated'; chapterId: number; trackId: number; createdBy: string }
  | { type: 'ChapterPublished'; chapterId: number; userId: string }
  | { type: 'ChapterUnpublished'; chapterId: number; userId: string }
  | { type: 'ChapterDeleted'; chapterId: number; userId: string }
  | { type: 'ChapterUpdated'; chapterId: number; userId: string }
  // Media events
  | { type: 'AudioUploaded'; audioFileId: number; chapterId: number; uploadedBy: string }
  | { type: 'AudioDeleted'; audioFileId: number; chapterId: number }
  | { type: 'SegmentMappingCreated'; mappingId: number; chapterId: number; createdBy: string }
  | { type: 'SegmentMappingDeleted'; mappingId: number; chapterId: number }
  // Batch events
  | { type: 'BatchCreated'; batchId: number; trackId: number; createdBy: string }
  | { type: 'BatchStatusChanged'; batchId: number; status: string }
  | { type: 'StudentEnrolled'; batchId: number; studentId: string; enrolledBy: string }
  | { type: 'StudentDropped'; batchId: number; studentId: string; reason?: string }
  | { type: 'CoInstructorAssigned'; batchId: number; instructorId: string; assignedBy: string }
  | { type: 'CoInstructorRemoved'; batchId: number; instructorId: string }
  // Progress events
  | { type: 'ProgressUpdated'; studentId: string; chapterId: number; batchId?: number; proficiencyLevel: number; evaluatedBy: string }
  | { type: 'ProgressCreated'; studentId: string; chapterId: number; evaluatedBy: string }
  // Settings events
  | { type: 'SettingChanged'; key: string; value: string; changedBy: string };
