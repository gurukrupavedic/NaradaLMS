/**
 * Identity & Access Module - Type Definitions
 */

export type UserRole = "admin" | "instructor" | "student" | "content_manager";
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

export interface UserWithoutPassword extends Omit<User, "passwordHash"> {}

export interface Session {
  sid: string;
  sess: any;
  expire: Date;
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