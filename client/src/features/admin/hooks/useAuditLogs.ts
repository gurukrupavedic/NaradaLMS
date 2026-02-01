import { useQuery } from "@tanstack/react-query";
import { apiRequest } from '@/lib/apiClient';

export type AuditLogFilters = {
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: string; // ISO string
  endDate?: string;   // ISO string
  limit?: number;
  offset?: number;
};

export type AuditLogItem = {
  id: number;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes?: any;
  timestamp: string;
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
};

export function buildQueryString(filters: AuditLogFilters): string {
  const params = new URLSearchParams();
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.action) params.set("action", filters.action);
  if (filters.resourceType) params.set("resourceType", filters.resourceType);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  params.set("limit", String(filters.limit ?? 50));
  params.set("offset", String(filters.offset ?? 0));
  return params.toString();
}

export function useAuditLogs(filters: AuditLogFilters) {
  const qs = buildQueryString(filters);
  const url = "/api/admin/audit-logs?" + qs;

  return useQuery<{ success: boolean; data: AuditLogItem[]; pagination: { limit: number; offset: number } }>({
    queryKey: [url],
    queryFn: async () => {
      const response = await apiRequest(url.replace('/api', ''));
      return await response.json();
    }
  });
}
