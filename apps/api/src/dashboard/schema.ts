import type { Batch, BatchWithRole } from '../batches/schema'
import type { Evaluation } from '../evaluations/schema'
import type { ExamWithDetail } from '../exams/schema'
import type { TrackCertification, TrackWithChapters } from '../tracks/schema'

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
  certifications: TrackCertification[]
  upcomingExams: ExamWithDetail[]
  teaching: TeachingSummary[]
  pastBatchesByStudent: PastBatchesEntry[]
  // Every batch this profile has a request pending on (`enrollmentRequests/service.ts::request`)
  // — components/open-batch-picker.tsx uses this to show "pending approval" instead of a "Join"
  // button for a batch the reader already asked to join, without a second round-trip per row.
  pendingBatchIds: string[]
}
