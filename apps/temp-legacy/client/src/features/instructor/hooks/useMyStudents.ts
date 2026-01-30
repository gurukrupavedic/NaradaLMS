import { useQuery } from '@tanstack/react-query';
import { GetMyStudentsResponse } from '@shared/types';

interface FetchParams {
  limit?: number;
  offset?: number;
  search?: string;
  batchId?: number;
  status?: 'active' | 'dropped' | 'completed';
}

export const useMyStudents = ({ limit = 50, offset = 0, search, batchId, status }: FetchParams = {}) => {
  return useQuery({
    queryKey: ['myStudents', { limit, offset, search, batchId, status }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });

      if (search) params.append('search', search);
      if (batchId) params.append('batchId', String(batchId));
      if (status) params.append('status', status);

      const response = await fetch(`/api/batches/my-students?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch students');
      }

      const data = (await response.json()) as GetMyStudentsResponse;
      return data;
    },
  });
};
