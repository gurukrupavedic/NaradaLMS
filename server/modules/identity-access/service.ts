import bcrypt from "bcrypt";
import { identityStorage } from "./storage";
import { eventBus } from "../../shared/events/event-bus";
import type {
  MembershipApprovedEvent,
  MembershipDisabledEvent,
  MembershipEnabledEvent,
  MembershipRejectedEvent,
  MembershipRolesChangedEvent,
  SuperAdminGrantedEvent,
  SuperAdminRevokedEvent,
} from "../../shared/events/types";

/**
 * Identity & Access Service
 * Handles all user authentication, registration, and role management
 * Publishes events for user lifecycle (approval, role changes)
 */
export class IdentityService {
  private async publishGovernanceEvent(
    event:
      | MembershipApprovedEvent
      | MembershipRejectedEvent
      | MembershipEnabledEvent
      | MembershipDisabledEvent
      | MembershipRolesChangedEvent
      | SuperAdminGrantedEvent
      | SuperAdminRevokedEvent
  ) {
    await eventBus.publish(event.type, event);
  }

  /**
   * Register a new local user with a pending (or bootstrap-active) org membership.
   * Self-serve: `users.status` is `active`; access is governed by `user_organizations`.
   * Admin email: active user + active SLMTS membership with org admin roles (pilot bootstrap).
   */
  async registerUser(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    adminEmail?: string;
    /** Target org slug from tenant resolution (`slmts` | `rr`). */
    tenantSlug: string;
  }) {
    const normalizedEmail = String(data.email).toLowerCase();

    const existing = await identityStorage.getUserByEmail(normalizedEmail);
    if (existing) {
      throw new Error("Email already registered");
    }

    const org = await identityStorage.getOrganizationBySlug(data.tenantSlug);
    if (!org) {
      throw new Error("Organization not available for registration");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const isAdminEmail =
      Boolean(data.adminEmail) &&
      normalizedEmail === String(data.adminEmail).toLowerCase();

    if (isAdminEmail) {
      const slmtsOrg = await identityStorage.getOrganizationBySlug("slmts");
      if (!slmtsOrg) {
        throw new Error(
          "SLMTS organization is not configured (run db:seed-orgs first)."
        );
      }

      const user = await identityStorage.registerLocalUserWithOrgMembership({
        email: normalizedEmail,
        passwordHash,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        legacyRoles: ["admin"],
        legacyStatus: "active",
        orgId: slmtsOrg.id,
        membershipStatus: "active",
        membershipRoles: ["student", "admin"],
        membershipApprovedAt: new Date(),
        membershipSelfApproved: true,
      });

      return {
        userId: user.id,
        email: user.email,
        legacyStatus: user.status,
        tenantSlugRegistered: slmtsOrg.slug,
        membership: { orgSlug: slmtsOrg.slug, status: "active" as const },
        message: "Admin account created.",
      };
    }

    const user = await identityStorage.registerLocalUserWithOrgMembership({
      email: normalizedEmail,
      passwordHash,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      legacyRoles: [],
      legacyStatus: "active",
      orgId: org.id,
      membershipStatus: "pending",
      membershipRoles: ["student"],
    });

    return {
      userId: user.id,
      email: user.email,
      legacyStatus: user.status,
      tenantSlugRegistered: org.slug,
      membership: { orgSlug: org.slug, status: "pending" as const },
      message:
        "Account created. Your membership request is pending approval.",
    };
  }

  async requestMembership(data: { userId: string; tenantSlug: string }) {
    const org = await identityStorage.getOrganizationBySlug(data.tenantSlug);
    if (!org) {
      throw new Error("Organization not available for membership request");
    }

    const existingMembership = await identityStorage.getMembershipByUserAndOrg(
      data.userId,
      org.id
    );

    if (existingMembership?.status === "active") {
      return {
        result: "already_active" as const,
        membership: {
          orgId: existingMembership.orgId,
          orgSlug: existingMembership.orgSlug,
          status: existingMembership.status,
        },
      };
    }

    if (existingMembership?.status === "pending") {
      return {
        result: "already_pending" as const,
        membership: {
          orgId: existingMembership.orgId,
          orgSlug: existingMembership.orgSlug,
          status: existingMembership.status,
        },
      };
    }

    if (existingMembership?.status === "inactive") {
      return {
        result: "inactive_membership" as const,
        membership: {
          orgId: existingMembership.orgId,
          orgSlug: existingMembership.orgSlug,
          status: existingMembership.status,
        },
      };
    }

    if (existingMembership?.status === "rejected") {
      return {
        result: "rejected_membership" as const,
        membership: {
          orgId: existingMembership.orgId,
          orgSlug: existingMembership.orgSlug,
          status: existingMembership.status,
        },
      };
    }

    await identityStorage.upsertOrgMembership({
      userId: data.userId,
      orgId: org.id,
      roles: ["student"],
      status: "pending",
    });

    return {
      result: "created_pending" as const,
      membership: {
        orgId: org.id,
        orgSlug: org.slug,
        status: "pending" as const,
      },
    };
  }

  /**
   * Authenticate user with email and password
   */
  async authenticateLocal(email: string, password: string) {
    const normalizedEmail = String(email).toLowerCase();
    const user = await identityStorage.getUserByEmail(normalizedEmail);

    if (!user) {
      throw new Error("Invalid email or password");
    }

    if (user.status === "inactive") {
      throw new Error("Your account has been disabled.");
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash || "");
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    return user;
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string) {
    const user = await identityStorage.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string) {
    return await identityStorage.getUserByEmail(
      String(email).toLowerCase()
    );
  }

  /**
   * Get user by OAuth provider
   */
  async getUserByProviderId(provider: string, providerId: string) {
    return await identityStorage.getUserByProviderId(provider, providerId);
  }

  /**
   * Upsert user (create or update)
   * Used for OAuth flows
   */
  async upsertOAuthUser(data: {
    provider: string;
    providerId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  }) {
    return await identityStorage.upsertUser({
      ...data,
      roles: ["student"], // Default role for OAuth users
      status: "active", // Auto-activate OAuth users
    });
  }

  /**
   * Get user counts by status (for admin UI tab badges). Optional search filter.
   */
  async getUserStatusCounts(search?: string) {
    return await identityStorage.getUserStatusCounts(search);
  }

  /**
   * Get users with database-level pagination and optional filters (admin only)
   */
  async listUsersPaginated(
    limit: number,
    offset: number,
    filters?: { status?: string; role?: string; search?: string }
  ) {
    return await identityStorage.listUsersPaginated(limit, offset, filters);
  }

  /**
   * Approve a pending user and add student role
   * Publishes UserApproved event
   */
  async approveUser(userId: string, approvedBy: string) {
    const targetUser = await identityStorage.getUser(userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    // Add student role if not present
    const updatedRoles = Array.isArray(targetUser.roles)
      ? [...targetUser.roles]
      : [];
    if (!updatedRoles.includes("student")) {
      updatedRoles.push("student");
    }

    // Update user
    const approvedUser = await identityStorage.updateUserStatus(
      userId,
      "active"
    );
    await identityStorage.updateUserRoles(userId, updatedRoles);

    // Publish event for audit logging
    await eventBus.publish("UserApproved", {
      type: "UserApproved",
      userId: approvedUser.id,
      approvedBy,
      timestamp: new Date(),
    });

    return {
      id: approvedUser.id,
      email: approvedUser.email,
      status: approvedUser.status,
      roles: updatedRoles,
    };
  }

  /**
   * Assign roles to a user
   * Publishes UserRoleChanged event
   */
  async assignRoles(userId: string, roles: string[], changedBy: string) {
    const targetUser = await identityStorage.getUser(userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    const updatedUser = await identityStorage.updateUserRoles(userId, roles);

    // Publish event for audit logging
    await eventBus.publish("UserRoleChanged", {
      type: "UserRoleChanged",
      userId: updatedUser.id,
      newRoles: roles,
      changedBy,
      timestamp: new Date(),
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      roles: updatedUser.roles,
    };
  }

  /**
   * Disable a user account
   */
  async disableUser(userId: string) {
    return await identityStorage.updateUserStatus(userId, "inactive");
  }

  /**
   * Enable a user account (set status back to active)
   */
  async enableUser(userId: string) {
    return await identityStorage.updateUserStatus(userId, "active");
  }

  /**
   * Reject a pending user (deletes the user)
   * Publishes UserRejected event
   */
  async rejectUser(userId: string) {
    const targetUser = await identityStorage.getUser(userId);
    if (!targetUser) {
      throw new Error("User not found");
    }
    if (targetUser.status !== "pending_approval") {
      throw new Error("Only pending users can be rejected");
    }

    await identityStorage.deleteUser(userId);

    // Publish event for audit logging
    await eventBus.publish("UserRejected", {
      type: "UserRejected",
      userId,
      timestamp: new Date(),
    });

    return { id: userId, status: "rejected" };
  }

  /**
   * Get user's roles
   */
  async getUserRoles(userId: string) {
    const user = await identityStorage.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return user.roles || [];
  }

  /**
   * Check if user has a specific role
   */
  async userHasRole(userId: string, role: string) {
    const roles = await this.getUserRoles(userId);
    return roles.includes(role);
  }

  /**
   * Check if user is admin
   */
  async isAdmin(userId: string) {
    return await this.userHasRole(userId, "admin");
  }

  /**
   * Check if user is instructor
   */
  async isInstructor(userId: string) {
    return await this.userHasRole(userId, "instructor");
  }

  /**
   * Check if user is student
   */
  async isStudent(userId: string) {
    return await this.userHasRole(userId, "student");
  }

  async listGovernanceUsers(
    limit: number,
    offset: number,
    filters?: {
      membershipStatus?: "pending" | "active" | "inactive" | "rejected";
      orgSlug?: string;
      membershipHasRole?: string;
      search?: string;
    }
  ) {
    const { ids, total } = await identityStorage.listGovernanceUserIdsPaginated(
      limit,
      offset,
      filters
    );
    const users = await identityStorage.getGovernanceUsersHydrated(ids);
    const statusCounts = await identityStorage.getGovernanceMembershipTabCounts({
      search: filters?.search,
      orgSlug: filters?.orgSlug,
      membershipHasRole: filters?.membershipHasRole as
        | "student"
        | "instructor"
        | "admin"
        | undefined,
    });
    return { users, total, statusCounts };
  }

  async getUserWithMembershipsForGovernance(userId: string) {
    const rows = await identityStorage.getGovernanceUsersHydrated([userId]);
    const u = rows[0];
    if (!u) throw new Error("User not found");
    return u;
  }

  async approveMembership(membershipId: string, actorUserId: string) {
    const row = await identityStorage.getMembershipWithUserOrg(membershipId);
    if (!row) throw new Error("Membership not found");
    if (row.status !== "pending") {
      throw new Error("Only pending memberships can be approved");
    }
    const now = new Date();
    await identityStorage.updateMembershipRecord(membershipId, {
      status: "active",
      approvedAt: now,
      approvedBy: actorUserId,
    });
    await this.publishGovernanceEvent({
      type: "MembershipApproved",
      membershipId,
      targetUserId: row.userId,
      actorUserId,
      orgId: row.orgId,
      timestamp: now,
    });
    return { membershipId, userId: row.userId, orgId: row.orgId, status: "active" as const };
  }

  async rejectMembership(membershipId: string, actorUserId: string) {
    const row = await identityStorage.getMembershipWithUserOrg(membershipId);
    if (!row) throw new Error("Membership not found");
    if (row.status !== "pending") {
      throw new Error("Only pending memberships can be rejected");
    }
    const now = new Date();
    await identityStorage.updateMembershipRecord(membershipId, {
      status: "rejected",
      approvedAt: null,
      approvedBy: null,
    });
    await this.publishGovernanceEvent({
      type: "MembershipRejected",
      membershipId,
      targetUserId: row.userId,
      actorUserId,
      orgId: row.orgId,
      timestamp: now,
    });
    return { membershipId, userId: row.userId, status: "rejected" as const };
  }

  async setMembershipActiveFlag(
    membershipId: string,
    target: "inactive" | "active",
    actorUserId: string
  ) {
    const row = await identityStorage.getMembershipWithUserOrg(membershipId);
    if (!row) throw new Error("Membership not found");
    if (target === "inactive" && row.status === "pending") {
      throw new Error("Use reject for pending memberships");
    }
    const now = new Date();
    await identityStorage.updateMembershipRecord(membershipId, {
      status: target,
    });
    if (target === "active") {
      await this.publishGovernanceEvent({
        type: "MembershipEnabled",
        membershipId,
        targetUserId: row.userId,
        actorUserId,
        orgId: row.orgId,
        status: "active",
        timestamp: now,
      });
    } else {
      await this.publishGovernanceEvent({
        type: "MembershipDisabled",
        membershipId,
        targetUserId: row.userId,
        actorUserId,
        orgId: row.orgId,
        status: "inactive",
        timestamp: now,
      });
    }
    return { membershipId, status: target };
  }

  async setMembershipRoles(membershipId: string, roles: string[], actorUserId: string) {
    const row = await identityStorage.getMembershipWithUserOrg(membershipId);
    if (!row) throw new Error("Membership not found");
    const allowed = new Set(["student", "instructor", "admin"]);
    for (const r of roles) {
      if (!allowed.has(r)) throw new Error(`Invalid role: ${r}`);
    }
    if (roles.length === 0) {
      throw new Error("At least one role is required");
    }
    await identityStorage.updateMembershipRecord(membershipId, { roles });
    await this.publishGovernanceEvent({
      type: "MembershipRolesChanged",
      membershipId,
      targetUserId: row.userId,
      actorUserId,
      orgId: row.orgId,
      roles,
      timestamp: new Date(),
    });
    return { membershipId, roles };
  }

  async grantSuperAdmin(targetUserId: string, actorUserId: string) {
    const target = await identityStorage.getUser(targetUserId);
    if (!target) throw new Error("User not found");
    await identityStorage.setUserIsSuperAdmin(targetUserId, true);
    await this.publishGovernanceEvent({
      type: "SuperAdminGranted",
      targetUserId,
      actorUserId,
      timestamp: new Date(),
    });
    return { userId: targetUserId, isSuperAdmin: true };
  }

  async revokeSuperAdmin(targetUserId: string, actorUserId: string) {
    if (targetUserId === actorUserId) {
      throw new Error("You cannot revoke your own super-admin access");
    }
    const target = await identityStorage.getUser(targetUserId);
    if (!target) throw new Error("User not found");
    if (!target.isSuperAdmin) {
      throw new Error("User is not a super-admin");
    }
    const n = await identityStorage.countSuperAdminUsers();
    if (n <= 1) {
      throw new Error("Cannot revoke the last super-admin");
    }
    await identityStorage.setUserIsSuperAdmin(targetUserId, false);
    await this.publishGovernanceEvent({
      type: "SuperAdminRevoked",
      targetUserId,
      actorUserId,
      timestamp: new Date(),
    });
    return { userId: targetUserId, isSuperAdmin: false };
  }

  async listDirectoryUsersInOrg(params: {
    orgId: string;
    membershipHasRole?: "student" | "instructor" | "admin";
    search?: string;
    limit: number;
  }) {
    return identityStorage.listDirectoryUsersInOrg(params);
  }
}

export const identityService = new IdentityService();