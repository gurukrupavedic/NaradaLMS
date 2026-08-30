import type { Batch, BatchWithRole } from '../batches/schema'
import type { Evaluation } from '../evaluations/schema'
import type { ExamWithDetail } from '../exams/schema'
import type { TrackWithChapters } from '../tracks/schema'

export type TeachingSummary = { batchId: string; evaluations: Evaluation[] }
export type PastBatchesEntry = { studentId: string; batches: Batch[] }

// A pure aggregation of already-validated pieces from other domains — no external input is ever
// parsed against this shape, so a plain composed type (matching apps/api/src's own
// DashboardData) is enough; there's no need to re-wrap every field in its own zod schema here.
export type DashboardData = {
  firstName: string
  memberships: BatchWithRole[]
  tracks: TrackWithChapters[]
  studentEvaluations: Evaluation[]
  upcomingExams: ExamWithDetail[]
  teaching: TeachingSummary[]
  pastBatchesByStudent: PastBatchesEntry[]
}
