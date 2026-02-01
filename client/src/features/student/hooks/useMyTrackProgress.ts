import { useQuery } from '@tanstack/react-query';
import { StudentProgressData } from '@shared/types';
import { apiRequest } from '@/lib/apiClient';

export const useMyTrackProgress = () => {
  return useQuery({
    queryKey: ['myTrackProgress'],
    queryFn: async () => {
      const response = await apiRequest('/learning/my-progress', {
        method: 'GET',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch learning progress');
      }

      return (await response.json()) as StudentProgressData;
    },
  });
};
