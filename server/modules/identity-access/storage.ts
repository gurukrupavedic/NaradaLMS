import { db } from "../../db";
import { organizations, userOrganizations, users } from "@narada/types";
import { eq, and, or, ilike, sql, asc, desc, inArray, countDistinct } from "drizzle-orm";
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
   * Lookup one membership row for a given user and organization.
   */
  async getMembershipByUserAndOrg(
    userId: string,
    orgId: string
  ): Promise<{
    membershipId: string;
    userId: string;
    orgId: string;
    orgSlug: string;
    orgName: string;
    roles: string[];
    status: string;
  } | null> {
    const [row] = await db
      .select({
        membershipId: userOrganizations.id,
        userId: userOrganizations.userId,
        orgId: userOrganizations.orgId,
        orgSlug: organizations.slug,
        orgName: organizations.name,
        roles: userOrganizations.roles,
        status: userOrganizations.status,
      })
      .from(userOrganizations)
      .innerJoin(organizations, eq(organizations.id, userOrganizations.orgId))
      .where(
        and(
          eq(userOrganizations.userId, userId),
          eq(userOrganizations.orgId, orgId)
        )
      )
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      membershipId: row.membershipId,
      userId: row.userId,
      orgId: row.orgId,
      orgSlug: row.orgSlug,
      orgName: row.orgName,
      roles: [...(row.roles ?? [])],
      status: row.status,
    };
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
    isSuperAdmin?: boolean;
    orgId: string;
    membershipStatus: "pending" | "active";
    membershipRoles: string[];
    membershipApprovedAt?: Date | null;
    /** When true, sets `approved_by` to the new user id (bootstrap admin self-approval). */
    membershipSelfApproved?: boolean;
    membershipApprovedByUserId?: string | null;
  }): Promise<{ id: string; email: string }> {
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
          isSuperAdmin: input.isSuperAdmin ?? false,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: users.id, email: users.email });

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
        email: userData.email,
        firstName: userData.firstName ?? null,
        lastName: userData.lastName ?? null,
        profileImageUrl: userData.profileImageUrl ?? null,
        passwordHash: userData.passwordHash ?? null,
        provider: userData.provider ?? "local",
        providerId: userData.providerId ?? null,
        isSuperAdmin: userData.isSuperAdmin ?? false,
        invitedBy: userData.invitedBy ?? null,
        invitedAt: userData.invitedAt ?? null,
        approvedAt: userData.approvedAt ?? null,
        approvedBy: userData.approvedBy ?? null,
        lastLoginAt: userData.lastLoginAt ?? null,
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
        email: userData.email,
        firstName: userData.firstName ?? null,
        lastName: userData.lastName ?? null,
        profileImageUrl: userData.profileImageUrl ?? null,
        passwordHash: userData.passwordHash ?? null,
        provider: userData.provider ?? "local",
        providerId: userData.providerId ?? null,
        isSuperAdmin: userData.isSuperAdmin ?? false,
        invitedBy: userData.invitedBy ?? null,
        invitedAt: userData.invitedAt ?? null,
        approvedAt: userData.approvedAt ?? null,
        approvedBy: userData.approvedBy ?? null,
        lastLoginAt: userData.lastLoginAt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          provider: userData.provider ?? sql`excluded.provider`,
          providerId: userData.providerId ?? sql`excluded.provider_id`,
          passwordHash: userData.passwordHash ?? sql`excluded.password_hash`,
          isSuperAdmin: userData.isSuperAdmin ?? sql`excluded.is_super_admin`,
          invitedBy: userData.invitedBy ?? sql`excluded.invited_by`,
          invitedAt: userData.invitedAt ?? sql`excluded.invited_at`,
          approvedAt: userData.approvedAt ?? sql`excluded.approved_at`,
          approvedBy: userData.approvedBy ?? sql`excluded.approved_by`,
          lastLoginAt: userData.lastLoginAt ?? sql`excluded.last_login_at`,
          updatedAt: new Date(),
        },
      })
      .returning();
    const user = Array.isArray(result) ? result[0] : (result as any)?.rows?.[0];
    return user;
  }

  async getMembershipWithUserOrg(membershipId: string): Promise<{
    membershipId: string;
    userId: string;
    orgId: string;
    orgSlug: string;
    roles: string[];
    status: string;
  } | null> {
    const [row] = await db
      .select({
        membershipId: userOrganizations.id,
        userId: userOrganizations.userId,
        orgId: userOrganizations.orgId,
        orgSlug: organizations.slug,
        roles: userOrganizations.roles,
        status: userOrganizations.status,
      })
      .from(userOrganizations)
      .innerJoin(organizations, eq(organizations.id, userOrganizations.orgId))
      .where(eq(userOrganizations.id, membershipId))
      .limit(1);
    if (!row) return null;
    return {
      ...row,
      roles: [...(row.roles ?? [])],
    };
  }

  async updateMembershipRecord(
    membershipId: string,
    patch: {
      status?: "pending" | "active" | "inactive" | "rejected";
      roles?: string[];
      approvedAt?: Date | null;
      approvedBy?: string | null;
    }
  ): Promise<void> {
    const now = new Date();
    await db
      .update(userOrganizations)
      .set({
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.roles !== undefined ? { roles: patch.roles } : {}),
        ...(patch.approvedAt !== undefined ? { approvedAt: patch.approvedAt } : {}),
        ...(patch.approvedBy !== undefined ? { approvedBy: patch.approvedBy } : {}),
        updatedAt: now,
      })
      .where(eq(userOrganizations.id, membershipId));
  }

  private userSearchCondition(search?: string) {
    if (!search?.trim()) return undefined;
    const term = `%${search.trim()}%`;
    return or(
      ilike(users.email, term),
      ilike(users.firstName, term),
      ilike(users.lastName, term)
    );
  }

  /**
   * Distinct users matching governance list filters (membership-scoped).
   */
  async listGovernanceUserIdsPaginated(
    limit: number,
    offset: number,
    filters?: {
      membershipStatus?: "pending" | "active" | "inactive" | "rejected";
      orgSlug?: string;
      membershipHasRole?: string;
      search?: string;
    }
  ): Promise<{ ids: string[]; total: number }> {
    const searchCond = this.userSearchCondition(filters?.search);
    const hasMembershipFilter = Boolean(
      filters?.membershipStatus || filters?.orgSlug || filters?.membershipHasRole
    );

    const membershipConds: Parameters<typeof and>[0][] = [];
    if (filters?.membershipStatus) {
      membershipConds.push(eq(userOrganizations.status, filters.membershipStatus));
    }
    if (filters?.orgSlug) {
      membershipConds.push(eq(organizations.slug, filters.orgSlug));
    }
    if (filters?.membershipHasRole === "student") {
      membershipConds.push(
        sql`${userOrganizations.roles}::text[] @> ARRAY['student']::text[]`
      );
    } else if (filters?.membershipHasRole === "instructor") {
      membershipConds.push(
        sql`${userOrganizations.roles}::text[] @> ARRAY['instructor']::text[]`
      );
    } else if (filters?.membershipHasRole === "admin") {
      membershipConds.push(
        sql`${userOrganizations.roles}::text[] @> ARRAY['admin']::text[]`
      );
    }

    if (hasMembershipFilter) {
      const whereAll = and(searchCond, ...membershipConds);
      const [countRow] = await db
        .select({ c: countDistinct(users.id) })
        .from(users)
        .innerJoin(userOrganizations, eq(users.id, userOrganizations.userId))
        .innerJoin(organizations, eq(organizations.id, userOrganizations.orgId))
        .where(whereAll);
      const total = Number(countRow?.c ?? 0);

      const idRows = await db
        .selectDistinct({ id: users.id, createdAt: users.createdAt })
        .from(users)
        .innerJoin(userOrganizations, eq(users.id, userOrganizations.userId))
        .innerJoin(organizations, eq(organizations.id, userOrganizations.orgId))
        .where(whereAll)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      return { ids: idRows.map((r) => r.id), total };
    }

    const baseWhere = searchCond;
    const countQuery = db.select({ c: sql<number>`count(*)::int` }).from(users);
    const [cRow] = baseWhere ? await countQuery.where(baseWhere) : await countQuery;
    const total = Number(cRow?.c ?? 0);

    const sel = db.select({ id: users.id }).from(users);
    const rows = baseWhere
      ? await sel.where(baseWhere).orderBy(desc(users.createdAt)).limit(limit).offset(offset)
      : await sel.orderBy(desc(users.createdAt)).limit(limit).offset(offset);

    return { ids: rows.map((r) => r.id), total };
  }

  async getGovernanceUsersHydrated(userIds: string[]): Promise<
    {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      isSuperAdmin: boolean;
      memberships: {
        membershipId: string;
        orgId: string;
        orgSlug: string;
        orgName: string;
        roles: string[];
        status: string;
      }[];
    }[]
  > {
    if (userIds.length === 0) return [];

    const userRows = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        isSuperAdmin: users.isSuperAdmin,
      })
      .from(users)
      .where(inArray(users.id, userIds))
      .orderBy(desc(users.createdAt));

    const memRows = await db
      .select({
        userId: userOrganizations.userId,
        membershipId: userOrganizations.id,
        orgId: userOrganizations.orgId,
        orgSlug: organizations.slug,
        orgName: organizations.name,
        roles: userOrganizations.roles,
        status: userOrganizations.status,
      })
      .from(userOrganizations)
      .innerJoin(organizations, eq(organizations.id, userOrganizations.orgId))
      .where(inArray(userOrganizations.userId, userIds))
      .orderBy(asc(organizations.slug));

    const memByUser = new Map<string, typeof memRows>();
    for (const m of memRows) {
      const list = memByUser.get(m.userId) ?? [];
      list.push(m);
      memByUser.set(m.userId, list);
    }

    const order = new Map(userIds.map((id, i) => [id, i]));
    userRows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    return userRows.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      isSuperAdmin: u.isSuperAdmin,
      memberships: (memByUser.get(u.id) ?? []).map((m) => ({
        membershipId: m.membershipId,
        orgId: m.orgId,
        orgSlug: m.orgSlug,
        orgName: m.orgName,
        roles: [...(m.roles ?? [])],
        status: m.status,
      })),
    }));
  }

  /**
   * Tab counts for super-admin user list (distinct users per membership status).
   */
  async getGovernanceMembershipTabCounts(filters?: {
    search?: string;
    orgSlug?: string;
    membershipHasRole?: string;
  }): Promise<{
    all: number;
    pending: number;
    active: number;
    inactive: number;
    rejected: number;
  }> {
    const searchCond = this.userSearchCondition(filters?.search);
    const membershipConds: Parameters<typeof and>[0][] = [];

    if (filters?.orgSlug) {
      membershipConds.push(eq(organizations.slug, filters.orgSlug));
    }
    if (filters?.membershipHasRole === "student") {
      membershipConds.push(
        sql`${userOrganizations.roles}::text[] @> ARRAY['student']::text[]`
      );
    } else if (filters?.membershipHasRole === "instructor") {
      membershipConds.push(
        sql`${userOrganizations.roles}::text[] @> ARRAY['instructor']::text[]`
      );
    } else if (filters?.membershipHasRole === "admin") {
      membershipConds.push(
        sql`${userOrganizations.roles}::text[] @> ARRAY['admin']::text[]`
      );
    }

    const hasMembershipScope = membershipConds.length > 0;
    const buildMembershipWhere = (
      st?: "pending" | "active" | "inactive" | "rejected"
    ) => and(searchCond, ...(st ? [eq(userOrganizations.status, st)] : []), ...membershipConds);

    const all = hasMembershipScope
      ? Number(
          (
            await db
              .select({ c: countDistinct(users.id) })
              .from(users)
              .innerJoin(userOrganizations, eq(users.id, userOrganizations.userId))
              .innerJoin(organizations, eq(organizations.id, userOrganizations.orgId))
              .where(buildMembershipWhere())
          )[0]?.c ?? 0
        )
      : Number(
          (
            searchCond
              ? await db
                  .select({ c: sql<number>`count(*)::int` })
                  .from(users)
                  .where(searchCond)
              : await db.select({ c: sql<number>`count(*)::int` }).from(users)
          )[0]?.c ?? 0
        );

    const countForStatus = async (st: "pending" | "active" | "inactive" | "rejected") => {
      const where = buildMembershipWhere(st);
      const [r] = hasMembershipScope
        ? await db
            .select({ c: countDistinct(users.id) })
            .from(users)
            .innerJoin(userOrganizations, eq(users.id, userOrganizations.userId))
            .innerJoin(organizations, eq(organizations.id, userOrganizations.orgId))
            .where(where)
        : await db
            .select({ c: countDistinct(users.id) })
            .from(users)
            .innerJoin(userOrganizations, eq(users.id, userOrganizations.userId))
            .where(where);
      return Number(r?.c ?? 0);
    };

    const [pending, active, inactive, rejected] = await Promise.all([
      countForStatus("pending"),
      countForStatus("active"),
      countForStatus("inactive"),
      countForStatus("rejected"),
    ]);

    return { all, pending, active, inactive, rejected };
  }

  async countSuperAdminUsers(): Promise<number> {
    const [r] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.isSuperAdmin, true));
    return Number(r?.c ?? 0);
  }

  async setUserIsSuperAdmin(userId: string, value: boolean): Promise<void> {
    await db
      .update(users)
      .set({ isSuperAdmin: value, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  /**
   * Org-scoped directory for org admins (instructors / students in current org).
   */
  async listDirectoryUsersInOrg(params: {
    orgId: string;
    membershipHasRole?: "student" | "instructor" | "admin";
    search?: string;
    limit: number;
  }): Promise<
    { id: string; email: string; firstName: string | null; lastName: string | null }[]
  > {
    const searchCond = this.userSearchCondition(params.search);
    const roleCond =
      params.membershipHasRole === "student"
        ? sql`${userOrganizations.roles}::text[] @> ARRAY['student']::text[]`
        : params.membershipHasRole === "instructor"
          ? sql`${userOrganizations.roles}::text[] @> ARRAY['instructor']::text[]`
          : params.membershipHasRole === "admin"
            ? sql`${userOrganizations.roles}::text[] @> ARRAY['admin']::text[]`
            : undefined;

    const where = and(
      eq(userOrganizations.orgId, params.orgId),
      eq(userOrganizations.status, "active"),
      searchCond,
      roleCond
    );

    const rows = await db
      .selectDistinct({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .innerJoin(userOrganizations, eq(users.id, userOrganizations.userId))
      .where(where)
      .orderBy(asc(users.email))
      .limit(params.limit);

    return rows;
  }
}

export const identityStorage = new IdentityStorage();