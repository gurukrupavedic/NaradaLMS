/**
 * Identity & Access Module - Type Definitions
 */

export type UserRole = "admin" | "instructor" | "student";
export type UserStatus = "pending_approval" | "active" | "inactive";

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles: UserRole[];
  status: UserStatus;
  provider: string;
  providerId?: string | null;
  profileImageUrl?: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ApproveUserRequest {
  userId: string;
  approvedBy: string;
}

export interface AssignRolesRequest {
  userId: string;
  roles: UserRole[];
  changedBy: string;
}