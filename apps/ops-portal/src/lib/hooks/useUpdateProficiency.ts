import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

interface UpdateProficiencyInput {
    batchId: number;
    studentId: string;
    chapterId: number;
    proficiencyLevel: number;
    notes?: string;
}

interface UpdateProficiencyResponse {
    id: number;
    studentId: string;
    chapterId: number;
    batchId: number | null;
    proficiencyLevel: number;
    notes: string | null;
    lastEvaluatedAt: string;
    evaluatedBy: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Update student proficiency for a chapter
 */
export function useUpdateProficiency() {
    const queryClient = useQueryClient();

    return useMutation<UpdateProficiencyResponse, Error, UpdateProficiencyInput>({
        mutationFn: async (input) => {
            return apiRequest<UpdateProficiencyResponse>(
                `/batches/${input.batchId}/students/${input.studentId}/evaluate`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        chapterId: input.chapterId,
                        proficiencyLevel: input.proficiencyLevel,
                        notes: input.notes,
                    }),
                }
            );
        },
        onSuccess: (data, variables) => {
            const queryKey = `/batches/${variables.batchId}/progress`;

            // Immediately update cache with backend response (eliminates race conditions)
            queryClient.setQueryData([queryKey], (oldData: any) => {
                if (!oldData) return oldData;

                // Update the specific cell with backend response data
                return {
                    ...oldData,
                    rows: oldData.rows.map((row: any) => {
                        if (row.studentId !== data.studentId) return row;

                        return {
                            ...row,
                            cells: row.cells.map((cell: any) => {
                                if (cell.chapterId !== data.chapterId) return cell;

                                // Update with actual backend response values
                                return {
                                    ...cell,
                                    proficiencyLevel: data.proficiencyLevel,
                                    lastEvaluatedAt: data.lastEvaluatedAt,
                                    evaluatedBy: data.evaluatedBy,
                                    notes: data.notes,
                                };
                            }),
                        };
                    }),
                };
            });
        },
    });
}
