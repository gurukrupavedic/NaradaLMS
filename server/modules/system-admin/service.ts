/**
 * System Admin Module - Audit logging and settings management
 * 
 * Responsibilities:
 * - Audit log recording
 * - System settings management
 */

import { AdminStorage } from './storage';

export interface AuditFilter {
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
  scope?: "org" | "platform";
  orgId?: string;
  limit?: number;
  offset?: number;
}

export class AdminService {
  constructor(private storage: AdminStorage) {}

  /**
   * Log a user action to audit trail
   */
  async logAction(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    changes?: any,
    orgId?: string
  ): Promise<void> {
    await this.storage.insertAuditLog(userId, action, resourceType, resourceId, changes, orgId);
  }

  /**
   * Get audit logs with optional filters and pagination
   * @returns { rows: AuditLog[], total: number }
   */
  async getAuditLogs(filters: AuditFilter = {}) {
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    return await this.storage.getAuditLogs({
      userId: filters.userId,
      action: filters.action,
      resourceType: filters.resourceType,
      startDate: filters.startDate,
      endDate: filters.endDate,
      scope: filters.scope,
      orgId: filters.orgId,
      limit,
      offset,
    });
  }

  /**
   * Get system setting by key
   */
  async getSetting(key: string): Promise<string | null> {
    return await this.storage.getSetting(key);
  }

  /**
   * Get all system settings
   */
  async getAllSettings(): Promise<Record<string, string>> {
    return await this.storage.getAllSettings();
  }

  /**
   * Set system setting
   */
  async setSetting(key: string, value: string, updatedBy?: string): Promise<void> {
    await this.storage.setSetting(key, value, updatedBy);
  }

  /**
   * Get setting with default fallback
   */
  async getSettingWithDefault(key: string, defaultValue: string): Promise<string> {
    const value = await this.getSetting(key);
    return value ?? defaultValue;
  }

  /**
   * Get aggregated dashboard stats for Admin Center
   */
  async getAdminStats(recentLimit: number = 10) {
    return this.storage.getAdminStats(recentLimit);
  }
}

// Singleton instance (initialized in server/index.ts)
let adminServiceInstance: AdminService;

export const initAdminService = (storage: AdminStorage) => {
  adminServiceInstance = new AdminService(storage);
  return adminServiceInstance;
};

export const getAdminService = (): AdminService => {
  if (!adminServiceInstance) {
    throw new Error('AdminService not initialized. Call initAdminService() first.');
  }
  return adminServiceInstance;
};

