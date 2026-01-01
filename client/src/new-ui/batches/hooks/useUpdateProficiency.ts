import { useMutation, useQueryClient } from '@tanstack/react-query';

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
 * 
 * Endpoint: POST /api/batches/:batchId/students/:studentId/evaluate
 * Access: Instructors only
 * 
 * Upserts studentProgress record (student + chapter unique key)
 */
export function useUpdateProficiency() {
  const queryClient = useQueryClient();

  return useMutation<UpdateProficiencyResponse, Error, UpdateProficiencyInput>({
    mutationFn: async (input) => {
      const response = await fetch(
        `/api/batches/${input.batchId}/students/${input.studentId}/evaluate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            chapterId: input.chapterId,
            proficiencyLevel: input.proficiencyLevel,
            notes: input.notes,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Failed to update proficiency' } }));
        throw new Error(error.error?.message || 'Failed to update proficiency');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate batch progress to refresh matrix
      queryClient.invalidateQueries({ queryKey: ['batch-progress', variables.batchId] });
    },
  });
}
