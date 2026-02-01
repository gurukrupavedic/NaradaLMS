import { useQuery } from '@tanstack/react-query';
import { StudentDetail } from '@shared/types';
import { apiRequest } from '@/lib/apiClient';

export const useMyDetails = () => {
  return useQuery({
    queryKey: ['myDetails'],
    queryFn: async () => {
      const response = await apiRequest('/learning/my-details', {
        method: 'GET',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch learning details');
      }

      return (await response.json()) as StudentDetail;
    },
  });
};
