import { useQuery } from '@tanstack/react-query';
import { StudentDetail } from '@shared/types';

export const useStudentDetails = (studentId: string) => {
  return useQuery({
    queryKey: ['studentDetails', studentId],
    queryFn: async () => {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch(`/api/students/${studentId}/progress`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
