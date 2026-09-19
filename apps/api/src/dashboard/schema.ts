import type { Batch, BatchWithRole } from '../batches/schema'
import type { Evaluation } from '../evaluations/schema'
import type { ExamWithDetail, StudentExamResult } from '../exams/schema'
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
  // Every graded track exam this profile has sat, newest first. A student's certification on a
  // track is the latest of these for it (level L3/L4 certifies — see apps/web's `isCertified`).
  examResults: StudentExamResult[]
  upcomingExams: ExamWithDetail[]
  teaching: TeachingSummary[]
  pastBatchesByStudent: PastBatchesEntry[]
  // Every batch this profile has a request pending on (`enrollmentRequests/service.ts::request`)
  // — components/open-batch-picker.tsx uses this to show "pending approval" instead of a "Join"
  // button for a batch the reader already asked to join, without a second round-trip per row.
  pendingBatchIds: string[]
}
