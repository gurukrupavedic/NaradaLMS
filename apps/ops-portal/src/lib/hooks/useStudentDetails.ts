import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { StudentDetail } from '@narada/types';

// Re-export for component compatibility if needed, but prefer direct usage
export type StudentDetails = StudentDetail;

export function useStudentDetails(studentId: string) {
    return useQuery({
        queryKey: ['student', studentId],
        queryFn: async () => {
            // Updated to match monolith endpoint which returns details + matrix
            return apiRequest<StudentDetail>(`/students/${studentId}/progress`);
        },
        enabled: !!studentId,
    });
}
