import { useQuery } from '@tanstack/react-query';
import { StudentDetail } from '@shared/types';
import { apiRequest } from '@/lib/apiClient';

export const useStudentDetails = (studentId: string) => {
  return useQuery({
    queryKey: ['studentDetails', studentId],
    queryFn: async () => {
      const response = await apiRequest(`/students/${studentId}/progress`, {
        method: 'GET',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch student details');
      }

      const data = await response.json();
      return data as StudentDetail;
    },
    enabled: !!studentId, // Only run if studentId exists
  });
};
