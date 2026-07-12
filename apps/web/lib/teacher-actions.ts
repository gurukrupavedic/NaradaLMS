'use server'

import { revalidatePath } from 'next/cache'

import { createEvaluation } from '@/lib/api/evaluations'
import { type ProficiencyLevel } from '@/lib/proficiency'

export async function saveEvaluation({
  batchId,
  studentId,
  chapterId,
  level,
  notes,
}: {
  batchId: string
  studentId: string
  chapterId: string
  level: ProficiencyLevel
  notes: string
}): Promise<void> {
  await createEvaluation(batchId, {
    studentId,
    chapterId,
    level,
    notes: notes.trim() || undefined,
  })

  revalidatePath('/')
  revalidatePath(`/batches/${batchId}/students/${studentId}`)
}
