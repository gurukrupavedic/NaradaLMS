// Domain event definitions shared across modules

export type UserApprovedEvent = {
  type: "UserApproved";
  userId: string;
  approvedBy: string;
  timestamp: Date;
};

export type UserRejectedEvent = {
  type: "UserRejected";
  userId: string;
  timestamp: Date;
};

export type UserDisabledEvent = {
  type: "UserDisabled";
  userId: string;
};

export type UserEnabledEvent = {
  type: "UserEnabled";
  userId: string;
};

export type RoleAssignedEvent = {
  type: "RoleAssigned";
  userId: string;
  role: string;
};

export type RoleRemovedEvent = {
  type: "RoleRemoved";
  userId: string;
  role: string;
};

export type MembershipApprovedEvent = {
  type: "MembershipApproved";
  membershipId: string;
  targetUserId: string;
  actorUserId: string;
  orgId: string;
  timestamp: Date;
};

export type MembershipRejectedEvent = {
  type: "MembershipRejected";
  membershipId: string;
  targetUserId: string;
  actorUserId: string;
  orgId: string;
  timestamp: Date;
};

export type MembershipEnabledEvent = {
  type: "MembershipEnabled";
  membershipId: string;
  targetUserId: string;
  actorUserId: string;
  orgId: string;
  status: "active";
  timestamp: Date;
};

export type MembershipDisabledEvent = {
  type: "MembershipDisabled";
  membershipId: string;
  targetUserId: string;
  actorUserId: string;
  orgId: string;
  status: "inactive";
  timestamp: Date;
};

export type MembershipRolesChangedEvent = {
  type: "MembershipRolesChanged";
  membershipId: string;
  targetUserId: string;
  actorUserId: string;
  orgId: string;
  roles: string[];
  timestamp: Date;
};

export type SuperAdminGrantedEvent = {
  type: "SuperAdminGranted";
  targetUserId: string;
  actorUserId: string;
  timestamp: Date;
};

export type SuperAdminRevokedEvent = {
  type: "SuperAdminRevoked";
  targetUserId: string;
  actorUserId: string;
  timestamp: Date;
};

export type DomainEvent =
  // User events
  | UserApprovedEvent
  | UserRejectedEvent
  | UserDisabledEvent
  | UserEnabledEvent
  | RoleAssignedEvent
  | RoleRemovedEvent
  // Identity governance events
  | MembershipApprovedEvent
  | MembershipRejectedEvent
  | MembershipEnabledEvent
  | MembershipDisabledEvent
  | MembershipRolesChangedEvent
  | SuperAdminGrantedEvent
  | SuperAdminRevokedEvent
  // Content events
  | { type: "TrackCreated"; trackId: number; createdBy: string }
  | { type: "ChapterCreated"; chapterId: number; trackId: number; createdBy: string }
  | { type: "ChapterPublished"; chapterId: number; userId: string }
  | { type: "ChapterUnpublished"; chapterId: number; userId: string }
  | { type: "ChapterDeleted"; chapterId: number; userId: string }
  | { type: "ChapterUpdated"; chapterId: number; userId: string }
  // Media events
  | { type: "AudioUploaded"; audioFileId: number; chapterId: number; uploadedBy: string }
  | { type: "AudioDeleted"; audioFileId: number; chapterId: number }
  | { type: "SegmentMappingCreated"; mappingId: number; chapterId: number; createdBy: string }
  | { type: "SegmentMappingDeleted"; mappingId: number; chapterId: number }
  // Batch events
  | { type: "BatchCreated"; batchId: number; trackId: number; createdBy: string }
  | { type: "BatchStatusChanged"; batchId: number; status: string }
  | { type: "StudentEnrolled"; batchId: number; studentId: string; enrolledBy: string }
  | { type: "StudentDropped"; batchId: number; studentId: string; reason?: string }
  | { type: "CoInstructorAssigned"; batchId: number; instructorId: string; assignedBy: string }
  | { type: "CoInstructorRemoved"; batchId: number; instructorId: string }
  // Progress events
  | { type: "ProgressUpdated"; studentId: string; chapterId: number; batchId?: number; proficiencyLevel: number; evaluatedBy: string }
  | { type: "ProgressCreated"; studentId: string; chapterId: number; evaluatedBy: string }
  // Settings events
  | { type: "SettingChanged"; key: string; value: string; changedBy: string };
