import { useQuery } from '@tanstack/react-query';
import { StudentProgressData } from '@shared/types';

export const useTrackProgress = (studentId: string) => {
  return useQuery({
    queryKey: ['studentTrackProgress', studentId],
    queryFn: async () => {
      const response = await fetch(`/api/students/${studentId}/track-progress`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch track progress');
      }

      const data = await response.json();
      return data as StudentProgressData;
    },
    enabled: !!studentId,
  });
};
