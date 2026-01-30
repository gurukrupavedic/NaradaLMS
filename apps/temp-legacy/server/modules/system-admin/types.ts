/**
 * System Admin Module - Type Definitions
 */

export interface AuditLogRecord {
  id: number;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes: any;
  timestamp: Date;
  requestId?: string;
}

export interface SystemSettingRecord {
  key: string;
  value: string;
  description?: string;
  updatedBy?: string;
  updatedAt: Date;
}

export type AuditAction =
  | 'USER_APPROVED'
  | 'ROLE_ASSIGNED'
  | 'ROLE_REMOVED'
  | 'CHAPTER_PUBLISHED'
  | 'CHAPTER_UNPUBLISHED'
  | 'AUDIO_UPLOADED'
  | 'MAPPING_CREATED'
  | 'BATCH_CREATED'
  | 'STUDENT_ENROLLED'
  | 'STUDENT_DROPPED'
  | 'PROGRESS_UPDATED'
  | 'INSTRUCTOR_ASSIGNED';

export type ResourceType =
  | 'user'
  | 'chapter'
  | 'audioFile'
  | 'segmentMapping'
  | 'batch'
  | 'enrollment'
  | 'studentProgress'
  | 'coInstructor';

