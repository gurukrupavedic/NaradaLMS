/**
 * System Admin Module - Data Access Layer
 * Database operations for audit logs and system settings
 */

import { db } from '../../db';
import { auditLogs, systemSettings, users, userOrganizations, batches, tracks, chapters } from '@narada/types';
import { eq, gte, lte, and, sql, desc } from 'drizzle-orm';

export interface AuditLogFilter {
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
  scope?: 'org' | 'platform';
  orgId?: string;
  limit: number;
  offset: number;
}

export class AdminStorage {
  /**
   * Insert audit log entry
   */
  async insertAuditLog(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    changes?: any,
    orgId?: string
  ): Promise<void> {
    await db.insert(auditLogs).values({
      orgId: orgId ?? null,
      userId,
      action,
      resourceType,
      resourceId,
      changes: changes || null,
      timestamp: new Date(),
    });
  }

  /**
   * Get audit logs with filters and pagination
   */
  async getAuditLogs(filters: AuditLogFilter) {
    const conditions = [];

    if (filters.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters.resourceType) {
      conditions.push(eq(auditLogs.resourceType, filters.resourceType));
    }
    if (filters.startDate) {
      conditions.push(gte(auditLogs.timestamp, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(auditLogs.timestamp, filters.endDate));
    }
    if (filters.scope) {
      if (filters.scope === 'org') {
        conditions.push(sql`${auditLogs.orgId} IS NOT NULL`);
      } else {
        conditions.push(sql`${auditLogs.orgId} IS NULL`);
      }
    }
    if (filters.orgId) {
      conditions.push(eq(auditLogs.orgId, filters.orgId));
    }

    let query = db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        changes: auditLogs.changes,
        timestamp: auditLogs.timestamp,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(whereClause as any);
    const total = Number(countRow?.count ?? 0);

    const rows = await query
      .orderBy(desc(auditLogs.timestamp))
      .limit(filters.limit)
      .offset(filters.offset);

    return { rows, total };
  }

  /**
   * Get single system setting by key
   */
  async getSetting(key: string): Promise<string | null> {
    const result = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);

    return result.length > 0 ? result[0].value : null;
  }

  /**
   * Get all system settings
   */
  async getAllSettings(): Promise<Record<string, string>> {
    const results = await db.select().from(systemSettings);
    const settings: Record<string, string> = {};

    for (const row of results) {
      settings[row.key] = row.value;
    }

    return settings;
  }

  /**
   * Set system setting (insert or update)
   */
  async setSetting(key: string, value: string, updatedBy?: string): Promise<void> {
    const existing = await this.getSetting(key);

    if (existing) {
      // Update
      await db
        .update(systemSettings)
        .set({
          value,
          updatedBy: updatedBy || null,
          updatedAt: new Date(),
        })
        .where(eq(systemSettings.key, key));
    } else {
      // Insert
      await db.insert(systemSettings).values({
        key,
        value,
        updatedBy: updatedBy || null,
        updatedAt: new Date(),
      });
    }
  }

  /**
   * Get aggregated admin dashboard stats
   */
  async getAdminStats(recentLimit: number = 10) {
    const [{ totalUsers }] = await db
      .select({ totalUsers: sql<number>`count(*)` })
      .from(users);

    const [{ pendingApprovals }] = await db
      .select({
        pendingApprovals: sql<number>`count(*)::int`,
      })
      .from(userOrganizations)
      .where(eq(userOrganizations.status, 'pending'));

    const [{ activeUsers }] = await db
      .select({
        activeUsers: sql<number>`count(distinct ${userOrganizations.userId})::int`,
      })
      .from(userOrganizations)
      .where(eq(userOrganizations.status, 'active'));

    const [{ totalBatches }] = await db
      .select({ totalBatches: sql<number>`count(*)` })
      .from(batches);

    // Batches table has no status column; activeBatches equals totalBatches until status is added
    const [{ activeBatches }] = await db
      .select({ activeBatches: sql<number>`count(*)` })
      .from(batches);

    const [{ totalTracks }] = await db
      .select({ totalTracks: sql<number>`count(*)` })
      .from(tracks);

    const [{ totalChapters }] = await db
      .select({ totalChapters: sql<number>`count(*)` })
      .from(chapters);

    const recentAudit = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        timestamp: auditLogs.timestamp,
      })
      .from(auditLogs)
      .orderBy(desc(auditLogs.timestamp))
      .limit(recentLimit);

    return {
      totalUsers,
      pendingApprovals,
      activeUsers,
      totalBatches,
      activeBatches,
      totalTracks,
      totalChapters,
      recentAudit,
    };
  }
}
