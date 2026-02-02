import { useQuery } from '@tanstack/react-query';
import { StudentProgressData } from '@narada/types';
import { apiRequest } from '@/lib/api';

export const useMyTrackProgress = () => {
  return useQuery({
    queryKey: ['myTrackProgress'],
    queryFn: async () => {
      return apiRequest<StudentProgressData>('/learning/my-progress');
    },
  });
};
