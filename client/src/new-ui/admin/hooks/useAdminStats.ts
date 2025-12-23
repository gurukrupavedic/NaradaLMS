import { useQuery } from "@tanstack/react-query";

export type AdminStats = {
  totalUsers: number;
  pendingApprovals: number;
  activeUsers: number;
  totalBatches: number;
  activeBatches: number;
  totalTracks: number;
  totalChapters: number;
  recentAudit: Array<{
    id: number;
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    timestamp: string;
  }>;
};

export function useAdminStats(recentLimit: number = 10) {
  return useQuery<{ success: boolean; data: AdminStats }>({
    queryKey: ["/api/admin/stats?recentLimit=" + recentLimit],
  });
}
