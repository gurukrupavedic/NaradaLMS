import { db } from "../../db";
import { users } from "@narada/types";
import { eq, and, sql } from "drizzle-orm";

/**
 * Identity & Access - Data Access Layer
 * Handles all user-related database operations
 */
export class IdentityStorage {
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
   * Get all users
   */
  async getAllUsers(): Promise<any[]> {
    return await db.select().from(users);
  }

  /**
   * Get users with database-level pagination and optional filters
   */
  async listUsersPaginated(
    limit: number,
    offset: number,
    filters?: { status?: string; role?: string }
  ): Promise<{ items: any[]; total: number }> {
    const conditions: any[] = [];
    if (filters?.status && ["pending_approval", "active", "inactive"].includes(filters.status)) {
      conditions.push(eq(users.status, filters.status));
    }
    if (filters?.role) {
      conditions.push(sql`${filters.role} = ANY(${users.roles})`);
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