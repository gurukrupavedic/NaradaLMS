"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@narada/api-client";

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

export function useUpdateProficiency() {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateProficiencyResponse,
    Error,
    UpdateProficiencyInput
  >({
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
      queryClient.setQueryData([queryKey], (oldData: unknown) => {
        if (!oldData) return oldData;
        const o = oldData as {
          batchId: number;
          rows: Array<{
            studentId: string;
            cells: Array<{
              chapterId: number;
              proficiencyLevel: number;
              lastEvaluatedAt?: string | null;
              evaluatedBy?: string | null;
              notes?: string | null;
            }>;
          }>;
          chapters: { chapterId: number; title: string }[];
        };
        return {
          ...o,
          rows: o.rows.map((row) => {
            if (row.studentId !== data.studentId) return row;
            return {
              ...row,
              cells: row.cells.map((cell) => {
                if (cell.chapterId !== data.chapterId) return cell;
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
