"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@narada/api-client";

export interface StudentSummary {
  id: string;
  rollNumber: string;
  firstName?: string;
  lastName?: string;
  name: string;
  email: string;
  phone?: string;
  timezone?: string;
  type?: string;
  enrolledAt: string;
  status: "active" | "dropped" | "completed";
  batchId: number;
  batchName: string;
  batchCode: string;
}

export interface MyStudentsParams {
  limit?: number;
  offset?: number;
  search?: string;
  batchId?: number;
  status?: "active" | "dropped" | "completed";
}

export function useMyStudents(params: MyStudentsParams = {}) {
  const { limit = 50, offset = 0, search, batchId, status } = params;
  return useQuery({
    queryKey: ["my-students", { limit, offset, search, batchId, status }],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      if (search) queryParams.append("search", search);
      if (batchId) queryParams.append("batchId", String(batchId));
      if (status) queryParams.append("status", status);
      return apiRequest<{
        items: StudentSummary[];
        pagination: { limit: number; offset: number; total: number };
      }>(`/batches/my-students?${queryParams.toString()}`);
    },
  });
}
