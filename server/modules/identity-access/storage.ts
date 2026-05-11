import { db } from "../../db";
import { organizations, userOrganizations, users } from "@narada/types";
import { eq, and, or, ilike, sql, asc } from "drizzle-orm";
import type { JwtSignClaims, OrgMembershipStatusClaim } from "../../auth/jwt.utils";

/**
 * Identity & Access - Data Access Layer
 * Handles all user-related database operations
 */
export class IdentityStorage {
  /**
   * Build JWT claims for a user: super-admin flag plus org context from `user_organizations`.
   *
   * Without `targetOrgId`: default org prefers **active** membership in org slug `slmts`, else first active by slug;
   * if none, prefers **pending** `slmts`, else first pending by slug.
   *
   * With `targetOrgId`: org context is that org only if the user has an **active** membership there (else `null`).
   */
  async getJwtSignClaimsForUser(
    userId: string,
    options?: { targetOrgId?: string }
  ): Promise<JwtSignClaims | null> {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        isSuperAdmin: users.isSuperAdmin,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return null;
    }

    const membershipRows = await db
      .select({
        orgId: userOrganizations.orgId,
        orgSlug: organizations.slug,
        roles: userOrganizations.roles,
        status: userOrganizations.status,
      })
      .from(userOrganizations)
      .innerJoin(organizations, eq(organizations.id, userOrganizations.orgId))
      .where(eq(userOrganizations.userId, userId));

    const targetOrgId = options?.targetOrgId;
    let chosen: (typeof membershipRows)[0] | undefined;

    if (targetOrgId) {
      const row = membershipRows.find(
        (r) => r.orgId === targetOrgId && r.status === "active"
      );
      chosen = row;
    } else {
      const active = membershipRows.filter((r) => r.status === "active");
      const slmtsActive = active.find((r) => r.orgSlug === "slmts");
      if (slmtsActive) {
        chosen = slmtsActive;
      } else if (active.length > 0) {
        const sorted = [...active].sort((a, b) =>
          a.orgSlug.localeCompare(b.orgSlug)
        );
        chosen = sorted[0];
      }

      if (!chosen && membershipRows.length > 0) {
        const pending = membershipRows.filter((r) => r.status === "pending");
        const slmtsPending = pending.find((r) => r.orgSlug === "slmts");
        if (slmtsPending) {
          chosen = slmtsPending;
        } else if (pending.length > 0) {
          const sorted = [...pending].sort((a, b) =>
            a.orgSlug.localeCompare(b.orgSlug)
          );
          chosen = sorted[0];
        }
      }
    }

    if (targetOrgId && !chosen) {
      return null;
    }

    const base: JwtSignClaims = {
      id: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
    };

    if (chosen) {
      base.currentOrgId = chosen.orgId;
      base.orgRoles = [...(chosen.roles ?? [])];
      base.orgMembershipStatus = chosen.status as OrgMembershipStatusClaim;
    }

    return base;
  }

  /**
   * Lookup organization by canonical slug (`slmts`, `rr`).
   */
  async getOrganizationBySlug(
    slug: string
  ): Promise<{ id: string; slug: string; name: string } | null> {
    const [row] = await db
      .select({
        id: organizations.id,
        slug: organizations.slug,
        name: organizations.name,
      })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);
    return row ?? null;
  }

  /**
   * All memberships for a user with org metadata (for `/auth/me`).
   */
  async listUserMembershipsWithOrgs(userId: string): Promise<
    {
      membershipId: string;
      orgId: string;
      orgSlug: string;
      orgName: string;
      roles: string[];
      status: string;
    }[]
  > {
    const rows = await db
      .select({
        membershipId: userOrganizations.id,
        orgId: userOrganizations.orgId,
        orgSlug: organizations.slug,
        orgName: organizations.name,
        roles: userOrganizations.roles,
        status: userOrganizations.status,
      })
      .from(userOrganizations)
      .innerJoin(organizations, eq(organizations.id, userOrganizations.orgId))
      .where(eq(userOrganizations.userId, userId))
      .orderBy(asc(organizations.slug));

    return rows.map((r) => ({
      membershipId: r.membershipId,
      orgId: r.orgId,
      orgSlug: r.orgSlug,
      orgName: r.orgName,
      roles: [...(r.roles ?? [])],
      status: r.status,
    }));
  }

  /**
   * Insert or update a single org membership row (register / OAuth bootstrap).
   */
  async upsertOrgMembership(params: {
    userId: string;
    orgId: string;
    roles: string[];
    status: "pending" | "active" | "inactive" | "rejected";
    approvedAt?: Date | null;
    approvedBy?: string | null;
  }): Promise<void> {
    const now = new Date();
    await db
      .insert(userOrganizations)
      .values({
        userId: params.userId,
        orgId: params.orgId,
        roles: params.roles,
        status: params.status,
        requestedAt: now,
        approvedAt: params.approvedAt ?? null,
        approvedBy: params.approvedBy ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [userOrganizations.userId, userOrganizations.orgId],
        set: {
          roles: params.roles,
          status: params.status,
          approvedAt: params.approvedAt ?? null,
          approvedBy: params.approvedBy ?? null,
          updatedAt: now,
        },
      });
  }

  /**
   * Create a local user and one org membership in a single transaction.
   */
  async registerLocalUserWithOrgMembership(input: {
    email: string;
    passwordHash: string;
    firstName: string | null;
    lastName: string | null;
    legacyRoles: string[];
    legacyStatus: "active" | "pending_approval";
    isSuperAdmin?: boolean;
    orgId: string;
    membershipStatus: "pending" | "active";
    membershipRoles: string[];
    membershipApprovedAt?: Date | null;
    /** When true, sets `approved_by` to the new user id (bootstrap admin self-approval). */
    membershipSelfApproved?: boolean;
    membershipApprovedByUserId?: string | null;
  }): Promise<{ id: string; email: string; status: string }> {
    const now = new Date();
    return db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email: input.email,
          passwordHash: input.passwordHash,
          provider: "local",
          firstName: input.firstName,
          lastName: input.lastName,
          roles: input.legacyRoles,
          status: input.legacyStatus,
          isSuperAdmin: input.isSuperAdmin ?? false,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: users.id, email: users.email, status: users.status });

      if (!user) {
        throw new Error("Failed to create user");
      }

      const approvedBy = input.membershipSelfApproved
        ? user.id
        : input.membershipApprovedByUserId ?? null;

      await tx.insert(userOrganizations).values({
        userId: user.id,
        orgId: input.orgId,
        roles: input.membershipRoles,
        status: input.membershipStatus,
        requestedAt: now,
        approvedAt: input.membershipApprovedAt ?? null,
        approvedBy,
        createdAt: now,
        updatedAt: now,
      });

      return user;
    });
  }

  /**
   * Get user by ID
   */
  async getUser(id: string): Promise<any> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<any | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user ?? null;
  }

  /**
   * Get user by OAuth provider
   */
  async getUserByProviderId(provider: string, providerId: string): Promise<any | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(eq(users.provider, provider), eq(users.providerId, providerId))
      );
    return user ?? null;
  }

  /**
   * Create new user
   */
  async createUser(userData: any): Promise<any> {
    const result = await db
      .insert(users)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    const user = Array.isArray(result) ? result[0] : (result as any)?.rows?.[0];
    return user;
  }

  /**
   * Upsert user (create or update)
   * Used for OAuth flows
   */
  async upsertUser(userData: any): Promise<any> {
    const result = await db
      .insert(users)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          roles: userData.roles ?? sql`excluded.roles`,
          status: userData.status ?? sql`excluded.status`,
          provider: userData.provider ?? sql`excluded.provider`,
          providerId: userData.providerId ?? sql`excluded.provider_id`,
          updatedAt: new Date(),
        },
      })
      .returning();
    const user = Array.isArray(result) ? result[0] : (result as any)?.rows?.[0];
    return user;
  }

  /**
   * Get counts of users by status (for tab badges).
   * Optionally filtered by search term (applied to same set of users as listUsersPaginated when search is used).
   */
  async getUserStatusCounts(search?: string): Promise<{
    all: number;
    pending_approval: number;
    active: number;
    inactive: number;
  }> {
    const searchCondition =
      search && search.trim()
        ? or(
            ilike(users.email, `%${search.trim()}%`),
            ilike(users.firstName, `%${search.trim()}%`),
            ilike(users.lastName, `%${search.trim()}%`)
          )
        : undefined;

    const base = db
      .select({ status: users.status, count: sql<number>`count(*)::int` })
      .from(users)
      .groupBy(users.status);
    const rows = searchCondition ? await base.where(searchCondition) : await base;

    const counts = { all: 0, pending_approval: 0, active: 0, inactive: 0 };
    for (const row of rows) {
      const n = Number(row.count ?? 0);
      counts.all += n;
      if (row.status === "pending_approval") counts.pending_approval = n;
      else if (row.status === "active") counts.active = n;
      else if (row.status === "inactive") counts.inactive = n;
    }
    return counts;
  }

  /**
   * Get users with database-level pagination and optional filters
   */
  async listUsersPaginated(
    limit: number,
    offset: number,
    filters?: { status?: string; role?: string; search?: string }
  ): Promise<{ items: any[]; total: number }> {
    const conditions: any[] = [];
    if (filters?.status && ["pending_approval", "active", "inactive"].includes(filters.status)) {
      conditions.push(eq(users.status, filters.status));
    }
    if (filters?.role) {
      conditions.push(sql`${filters.role} = ANY(${users.roles})`);
    }
    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(users.email, term),
          ilike(users.firstName, term),
          ilike(users.lastName, term)
        )
      );
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countQuery = db.select({ count: sql<number>`count(*)` }).from(users);
    const [countRow] = whereClause ? await countQuery.where(whereClause) : await countQuery;
    const total = Number(countRow?.count ?? 0);

    const baseSelect = db.select().from(users);
    const withWhere = whereClause ? baseSelect.where(whereClause) : baseSelect;
    const items = await withWhere.orderBy(users.createdAt).limit(limit).offset(offset);

    return { items, total };
  }

  /**
   * Update user roles
   */
  async updateUserRoles(userId: string, roles: string[]): Promise<any> {
    const [user] = await db
      .update(users)
      .set({ roles, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  /**
   * Update user status (active, pending_approval, inactive)
   */
  async updateUserStatus(userId: string, status: string): Promise<any> {
    const [user] = await db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  /**
   * Delete user by ID
   */
  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }
}

export const identityStorage = new IdentityStorage();