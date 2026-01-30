/**
 * System Admin - Event Handlers
 * Auto-logs domain events to audit trail
 */

import { getAdminService } from './service';
import { eventBus } from '../../shared/events/event-bus';

/**
 * Initialize all event handlers for audit logging
 * Called once during server startup
 */
export const initializeEventHandlers = () => {
  const adminService = getAdminService();

  // User events
  eventBus.subscribe('UserApproved', async (event: any) => {
    await adminService.logAction(
      event.approvedBy,
      'USER_APPROVED',
      'user',
      event.userId,
      { approvedAt: event.timestamp }
    );
  });

  eventBus.subscribe('UserRoleChanged', async (event: any) => {
    await adminService.logAction(
      event.userId, // User who changed their own role (or admin)
      event.added ? 'ROLE_ASSIGNED' : 'ROLE_REMOVED',
      'user',
      event.userId,
      { role: event.role, timestamp: event.timestamp }
    );
  });

  // Content events
  eventBus.subscribe('ChapterPublished', async (event: any) => {
    await adminService.logAction(
      event.userId,
      'CHAPTER_PUBLISHED',
      'chapter',
      event.chapterId.toString(),
      { publishedAt: event.timestamp }
    );
  });

  eventBus.subscribe('ChapterUnpublished', async (event: any) => {
    await adminService.logAction(
      event.userId,
      'CHAPTER_UNPUBLISHED',
      'chapter',
      event.chapterId.toString(),
      { unpublishedAt: event.timestamp }
    );
  });

  // Media events
  eventBus.subscribe('AudioUploaded', async (event: any) => {
    await adminService.logAction(
      'system', // No userId in event, use system
      'AUDIO_UPLOADED',
      'audioFile',
      event.audioFileId.toString(),
      { chapterId: event.chapterId, timestamp: event.timestamp }
    );
  });

  eventBus.subscribe('SegmentMappingCreated', async (event: any) => {
    await adminService.logAction(
      'system',
      'MAPPING_CREATED',
      'segmentMapping',
      event.mappingId.toString(),
      { chapterId: event.chapterId, timestamp: event.timestamp }
    );
  });

  // Batch events
  eventBus.subscribe('BatchCreated', async (event: any) => {
    await adminService.logAction(
      event.createdBy,
      'BATCH_CREATED',
      'batch',
      event.batchId.toString(),
      { trackId: event.trackId, timestamp: event.timestamp }
    );
  });

  eventBus.subscribe('StudentEnrolled', async (event: any) => {
    await adminService.logAction(
      event.enrolledBy,
      'STUDENT_ENROLLED',
      'enrollment',
      `${event.batchId}-${event.studentId}`,
      { batchId: event.batchId, studentId: event.studentId, timestamp: event.timestamp }
    );
  });

  eventBus.subscribe('StudentDropped', async (event: any) => {
    await adminService.logAction(
      'system',
      'STUDENT_DROPPED',
      'enrollment',
      `${event.batchId}-${event.studentId}`,
      { batchId: event.batchId, studentId: event.studentId, timestamp: event.timestamp }
    );
  });

  // Learning events
  eventBus.subscribe('ProgressUpdated', async (event: any) => {
    await adminService.logAction(
      event.studentId,
      'PROGRESS_UPDATED',
      'studentProgress',
      `${event.studentId}-${event.chapterId}`,
      { proficiencyLevel: event.proficiencyLevel, timestamp: event.timestamp }
    );
  });

  eventBus.subscribe('CoInstructorAssigned', async (event: any) => {
    await adminService.logAction(
      'system',
      'INSTRUCTOR_ASSIGNED',
      'coInstructor',
      `${event.batchId}-${event.instructorId}`,
      { batchId: event.batchId, instructorId: event.instructorId, timestamp: event.timestamp }
    );
  });

  console.log('[System Admin] Event handlers initialized - audit logging active');
};

