import { useQuery } from '@tanstack/react-query';
import { StudentProgressData } from '@shared/types';

export const useMyTrackProgress = () => {
  return useQuery({
    queryKey: ['myTrackProgress'],
    queryFn: async () => {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch('/api/learning/my-progress', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch learning progress');
      }

      return (await response.json()) as StudentProgressData;
    },
  });
};
