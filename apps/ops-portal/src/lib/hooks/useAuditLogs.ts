import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export interface AuditLog {
    id: number;
    userId: string;
    userFirstName?: string;
    userLastName?: string;
    userEmail?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    timestamp: string;
    changes?: Record<string, any>;
}

export interface AuditLogFilters {
    limit?: number;
    offset?: number;
    userId?: string;
    action?: string;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
}

export interface AuditLogsResponse {
    data: AuditLog[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
    };
}

export const useAuditLogs = (filters: AuditLogFilters) => {
    return useQuery({
        queryKey: ['audit-logs', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('limit', String(filters.limit ?? 25));
            params.append('offset', String(filters.offset ?? 0));
            if (filters.userId) params.append('userId', filters.userId);
            if (filters.action && filters.action !== 'all') params.append('action', filters.action);
            if (filters.resourceType && filters.resourceType !== 'all') params.append('resourceType', filters.resourceType);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            // Based on server/routes/admin.routes.ts, this endpoint is under /api/admin/audit-logs
            // It is NOT under /api/auth like users.
            return apiRequest<AuditLogsResponse>(`/admin/audit-logs?${params.toString()}`);
        },
        // Keep previous data while fetching new page for smoother experience
        placeholderData: (previousData) => previousData,
    });
};
