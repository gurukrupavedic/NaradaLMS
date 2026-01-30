import { useQuery } from '@tanstack/react-query';
import { StudentDetail } from '@shared/types';

export const useMyDetails = () => {
  return useQuery({
    queryKey: ['myDetails'],
    queryFn: async () => {
      const response = await fetch('/api/learning/my-details', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch learning details');
      }

      return (await response.json()) as StudentDetail;
    },
  });
};
