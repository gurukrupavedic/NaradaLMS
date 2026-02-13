import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export interface StudentSummary {
    id: string; // User ID (UUID string) from backend
    rollNumber: string;
    firstName?: string; // Optional - backend provides these now
    lastName?: string; // Optional - backend provides these now
    name: string; // Combined name from backend
    email: string;
    phone?: string; // Backend placeholder
    timezone?: string; // Backend placeholder
    type?: string; // Backend placeholder
    enrolledAt: string; // Original backend field name
    status: 'active' | 'dropped' | 'completed';
    batchId: number;
    batchName: string;
    batchCode: string;
}

export interface MyStudentsParams {
    limit?: number;
    offset?: number;
    search?: string;
    batchId?: number;
    status?: 'active' | 'dropped' | 'completed';
}

export function useMyStudents(params: MyStudentsParams = {}) {
    const { limit = 50, offset = 0, search, batchId, status } = params;

    return useQuery({
        queryKey: ['my-students', { limit, offset, search, batchId, status }],
        queryFn: async () => {
            const queryParams = new URLSearchParams({
                limit: String(limit),
                offset: String(offset),
            });

            if (search) queryParams.append('search', search);
            if (batchId) queryParams.append('batchId', String(batchId));
            if (status) queryParams.append('status', status);

            return apiRequest<{ items: StudentSummary[]; pagination: { limit: number; offset: number; total: number } }>(
                `/batches/my-students?${queryParams.toString()}`
            );
        },
    });
}
