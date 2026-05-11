/**
 * System Admin - Event Handlers
 * Auto-logs domain events to audit trail
 */

import { getAdminService } from './service';
import { eventBus } from '../../shared/events/event-bus';
import type {
  MembershipApprovedEvent,
  MembershipDisabledEvent,
  MembershipEnabledEvent,
  MembershipRejectedEvent,
  MembershipRolesChangedEvent,
  SuperAdminGrantedEvent,
  SuperAdminRevokedEvent,
} from '../../shared/events/types';
import { Logger } from '../../utils/logger';

/**
 * Initialize all event handlers for audit logging
 * Called once during server startup
 */
export const initializeEventHandlers = () => {
  const adminService = getAdminService();
  const logMembershipGovernance = async (
    event:
      | MembershipApprovedEvent
      | MembershipRejectedEvent
      | MembershipEnabledEvent
      | MembershipDisabledEvent
      | MembershipRolesChangedEvent,
    action: string,
    changes: Record<string, unknown>
  ) => {
    await adminService.logAction(
      event.actorUserId,
      action,
      'user_membership',
      event.membershipId,
      {
        targetUserId: event.targetUserId,
        orgId: event.orgId,
        scope: 'org',
        ...changes,
      },
      event.orgId
    );
  };

  const logPlatformGovernance = async (
    event: SuperAdminGrantedEvent | SuperAdminRevokedEvent,
    action: string,
    changes: Record<string, unknown>
  ) => {
    await adminService.logAction(
      event.actorUserId,
      action,
      'user',
      event.targetUserId,
      {
        targetUserId: event.targetUserId,
        scope: 'platform',
        ...changes,
      }
    );
  };

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
      event.changedBy || event.userId,
      'ROLE_CHANGED',
      'user',
      event.userId,
      { newRoles: event.newRoles, timestamp: event.timestamp }
    );
  });

  eventBus.subscribe('MembershipApproved', async (event: MembershipApprovedEvent) => {
    await logMembershipGovernance(event, 'MEMBERSHIP_APPROVED', {
      approvedAt: event.timestamp,
    });
  });

  eventBus.subscribe('MembershipRejected', async (event: MembershipRejectedEvent) => {
    await logMembershipGovernance(event, 'MEMBERSHIP_REJECTED', {
      rejectedAt: event.timestamp,
    });
  });

  eventBus.subscribe('MembershipEnabled', async (event: MembershipEnabledEvent) => {
    await logMembershipGovernance(event, 'MEMBERSHIP_ENABLED', {
      status: event.status,
      enabledAt: event.timestamp,
    });
  });

  eventBus.subscribe('MembershipDisabled', async (event: MembershipDisabledEvent) => {
    await logMembershipGovernance(event, 'MEMBERSHIP_DISABLED', {
      status: event.status,
      disabledAt: event.timestamp,
    });
  });

  eventBus.subscribe('MembershipRolesChanged', async (event: MembershipRolesChangedEvent) => {
    await logMembershipGovernance(event, 'MEMBERSHIP_ROLES_CHANGED', {
      roles: event.roles,
      rolesChangedAt: event.timestamp,
    });
  });

  eventBus.subscribe('SuperAdminGranted', async (event: SuperAdminGrantedEvent) => {
    await logPlatformGovernance(event, 'SUPER_ADMIN_GRANTED', {
      grantedAt: event.timestamp,
    });
  });

  eventBus.subscribe('SuperAdminRevoked', async (event: SuperAdminRevokedEvent) => {
    await logPlatformGovernance(event, 'SUPER_ADMIN_REVOKED', {
      revokedAt: event.timestamp,
    });
  });

  // Content events
  eventBus.subscribe('ChapterPublished', async (event: any) => {
    await adminService.logAction(
      event.publishedBy,
      'CHAPTER_PUBLISHED',
      'chapter',
      event.chapterId.toString(),
      { publishedAt: event.timestamp, scope: 'org' },
      event.orgId
    );
  });

  eventBus.subscribe('ChapterUnpublished', async (event: any) => {
    await adminService.logAction(
      event.unpublishedBy,
      'CHAPTER_UNPUBLISHED',
      'chapter',
      event.chapterId.toString(),
      { unpublishedAt: event.timestamp, scope: 'org' },
      event.orgId
    );
  });

  // Media events
  eventBus.subscribe('AudioUploaded', async (event: any) => {
    await adminService.logAction(
      event.uploadedBy,
      'AUDIO_UPLOADED',
      'audioFile',
      event.audioFileId.toString(),
      { chapterId: event.chapterId, scope: 'org', timestamp: event.timestamp },
      event.orgId
    );
  });

  eventBus.subscribe('SegmentMappingCreated', async (event: any) => {
    await adminService.logAction(
      event.createdBy,
      'MAPPING_CREATED',
      'segmentMapping',
      event.mappingId.toString(),
      { chapterId: event.chapterId, scope: 'org', timestamp: event.timestamp },
      event.orgId
    );
  });

  // Batch events
  eventBus.subscribe('BatchCreated', async (event: any) => {
    await adminService.logAction(
      event.createdBy,
      'BATCH_CREATED',
      'batch',
      event.batchId.toString(),
      { trackId: event.trackId, scope: 'org', timestamp: event.timestamp },
      event.orgId
    );
  });

  eventBus.subscribe('StudentEnrolled', async (event: any) => {
    await adminService.logAction(
      event.enrolledBy,
      'STUDENT_ENROLLED',
      'enrollment',
      `${event.batchId}-${event.studentId}`,
      { batchId: event.batchId, studentId: event.studentId, scope: 'org', timestamp: event.timestamp },
      event.orgId
    );
  });

  eventBus.subscribe('StudentDropped', async (event: any) => {
    await adminService.logAction(
      event.droppedBy,
      'STUDENT_DROPPED',
      'enrollment',
      `${event.batchId}-${event.studentId}`,
      { batchId: event.batchId, studentId: event.studentId, scope: 'org', timestamp: event.timestamp },
      event.orgId
    );
  });

  // Learning events
  eventBus.subscribe('ProgressUpdated', async (event: any) => {
    await adminService.logAction(
      event.evaluatedBy,
      'PROGRESS_UPDATED',
      'studentProgress',
      `${event.studentId}-${event.chapterId}`,
      {
        orgId: event.orgId,
        scope: 'org',
        batchId: event.batchId ?? null,
        proficiencyLevel: event.proficiencyLevel,
        timestamp: event.timestamp,
      },
      event.orgId
    );
  });

  eventBus.subscribe('CoInstructorAssigned', async (event: any) => {
    await adminService.logAction(
      event.assignedBy,
      'INSTRUCTOR_ASSIGNED',
      'coInstructor',
      `${event.batchId}-${event.instructorId}`,
      { batchId: event.batchId, instructorId: event.instructorId, scope: 'org', timestamp: event.timestamp },
      event.orgId
    );
  });

  Logger.info('[System Admin] Event handlers initialized - audit logging active');
};

