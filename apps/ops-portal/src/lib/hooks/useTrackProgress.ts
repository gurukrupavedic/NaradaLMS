import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { StudentProgressData, ChapterProgress, TrackProgress } from '../../../../../shared/types';

export function useTrackProgress(studentId: string) {
    return useQuery({
        queryKey: ['studentTrackProgress', studentId],
        queryFn: async () => {
            return apiRequest<StudentProgressData>(`/students/${studentId}/track-progress`);
        },
        enabled: !!studentId,
    });
}

export type { ChapterProgress, TrackProgress } from '../../../../../shared/types';
