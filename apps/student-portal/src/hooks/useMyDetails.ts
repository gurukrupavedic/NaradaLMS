import { useQuery } from '@tanstack/react-query';
import { StudentDetail } from '@narada/types';
import { apiRequest } from '@/lib/api';

export const useMyDetails = () => {
  return useQuery({
    queryKey: ['myDetails'],
    queryFn: async () => {
      return apiRequest<StudentDetail>('/learning/my-details');
    },
  });
};
