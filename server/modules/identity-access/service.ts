import bcrypt from "bcrypt";
import { identityStorage } from "./storage";
import { eventBus } from "../../shared/events/event-bus";

/**
 * Identity & Access Service
 * Handles all user authentication, registration, and role management
 * Publishes events for user lifecycle (approval, role changes)
 */
export class IdentityService {
  /**
   * Register a new user (pending approval or immediate if admin email)
   */
  async registerUser(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    adminEmail?: string; // Used to determine if should be pre-approved as admin
  }) {
    const normalizedEmail = String(data.email).toLowerCase();

    // Check if email already exists
    const existing = await identityStorage.getUserByEmail(normalizedEmail);
    if (existing) {
      throw new Error("Email already registered");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Check if this is the admin email
    const isAdminEmail =
      data.adminEmail && normalizedEmail === data.adminEmail.toLowerCase();

    // Create user
    const user = await identityStorage.createUser({
      email: normalizedEmail,
      passwordHash,
      provider: "local",
      roles: isAdminEmail ? ["admin"] : [],
      status: isAdminEmail ? "active" : "pending_approval",
      firstName: data.firstName || null,
      lastName: data.lastName || null,
    });

    return {
      userId: user.id,
      email: user.email,
      status: user.status,
      message: isAdminEmail
        ? "Admin account created."
        : "Account created. Awaiting admin approval.",
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

    // Check status
    if (user.status !== "active") {
      throw new Error("User account is not active. Awaiting admin approval.");
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
   * Get all users (admin only)
   */
  async getAllUsers() {
    return await identityStorage.getAllUsers();
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
}

export const identityService = new IdentityService();