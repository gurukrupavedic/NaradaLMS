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
 * 
 * RELIABILITY PATTERN:
 * Uses setQueryData with backend response to immediately update cache.
 * This eliminates race conditions and ensures UI shows exactly what was saved.
 * Backend response is the single source of truth.
 */
export function useUpdateProficiency() {
  const queryClient = useQueryClient();

  return useMutation<UpdateProficiencyResponse, Error, UpdateProficiencyInput>({
    mutationFn: async (input) => {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch(
        `/api/batches/${input.batchId}/students/${input.studentId}/evaluate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
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

      const responseData = await response.json();
      return responseData;
    },
    onSuccess: (data, variables) => {
      const queryKey = `/api/batches/${variables.batchId}/progress`;

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
