import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';

interface Batch {
  id: number;
  batchCode: string;
  batchName: string;
}

interface GetInstructorBatchesResponse {
  items: Batch[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export const useInstructorBatches = () => {
  return useQuery({
    queryKey: ['instructorBatches'],
    queryFn: async () => {
      const response = await apiRequest('/batches/my-batches', {
        method: 'GET',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch batches');
      }

      const data = (await response.json()) as GetInstructorBatchesResponse;
      return data.items; // Return just the items array
    },
  });
};
