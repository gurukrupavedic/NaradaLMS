/**
 * Identity & Access Module - Type Definitions
 */

export type UserRole = "admin" | "instructor" | "student";
export type MembershipStatus = "pending" | "active" | "inactive" | "rejected";

export interface UserMembership {
  membershipId: string;
  orgId: string;
  orgSlug: string;
  orgName: string;
  roles: UserRole[];
  status: MembershipStatus;
}

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isSuperAdmin: boolean;
  currentOrgId?: string;
  orgRoles?: UserRole[];
  orgMembershipStatus?: MembershipStatus;
  memberships?: UserMembership[];
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