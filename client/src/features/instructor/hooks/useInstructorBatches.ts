import { useQuery } from '@tanstack/react-query';

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
      const token = localStorage.getItem('jwt_token');
      const response = await fetch('/api/batches/my-batches', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
