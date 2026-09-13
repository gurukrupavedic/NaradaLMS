import { conflict } from '../error'
import type { Exam } from './schema'

export type ExamStatus = Exam['status']

export const allowedTransitions: Record<ExamStatus, ExamStatus[]> = {
  scheduled: ['inProgress', 'cancelled'],
  inProgress: ['cancelled'],
  completed: [],
  cancelled: [],
}

export function assertValidTransition(from: ExamStatus, to: ExamStatus): void {
  if (!allowedTransitions[from].includes(to)) {
    throw conflict(`cannot transition exam from '${from}' to '${to}'`)
  }
}
