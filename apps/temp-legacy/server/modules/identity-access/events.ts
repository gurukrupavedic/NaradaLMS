/**
 * Identity & Access Module - Domain Events
 * These events are published when user-related actions occur
 * and are used for audit logging and other cross-module concerns
 */

// Events are defined in server/shared/events/types.ts as part of the DomainEvent union
// This file serves as a reference for which events this module publishes

export const IDENTITY_EVENTS = {
  USER_APPROVED: "UserApproved",
  USER_ROLE_CHANGED: "UserRoleChanged",
};

// Type definitions for reference:
/*
export type UserApprovedEvent = {
  type: 'UserApproved';
  userId: string;
  approvedBy: string;
  timestamp: Date;
};

export type UserRoleChangedEvent = {
  type: 'UserRoleChanged';
  userId: string;
  newRoles: string[];
  changedBy: string;
  timestamp: Date;
};
*/