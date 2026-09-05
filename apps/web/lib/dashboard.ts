import 'server-only'

import { type BatchMembership } from '@/lib/api/batches'
import { getDashboard } from '@/lib/api/dashboard'
import { sortEvaluationsLatestFirst } from '@/lib/roster'
import type { ApiBatch, ApiEvaluation, ApiExam, ApiTrack } from '@/lib/types'

export type TeachingBatchData = {
  evaluations: ApiEvaluation[]
}

export type DashboardData = {
  firstName: string
  memberships: BatchMembership[]
  tracks: ApiTrack[]
  studentEvaluations: ApiEvaluation[]
  upcomingExams: ApiExam[]
  teachingByBatchId: Map<string, TeachingBatchData>
  pastBatchesByStudentId: Map<string, ApiBatch[]>
}

// A single GET /me/dashboard call now does everything this used to assemble from N HTTP
// round-trips (one per taught batch, one per taught student) — see apps/api/src/services/
// dashboard.ts for where that fan-out moved. This function is left as a thin reshape from the
// API's flat/array response into the Maps this page already expects, so the page component
// itself didn't need to change at all.
export async function getDashboardData(): Promise<DashboardData> {
  const dashboard = await getDashboard()

  const memberships: BatchMembership[] = dashboard.memberships.map(({ role, ...batch }) => ({
    batch,
    role,
  }))

  return {
    firstName: dashboard.firstName,
    memberships,
    tracks: dashboard.tracks,
    // Every reader below takes the first row per chapter as the latest mark, so the order is
    // load-bearing — normalise it here rather than trusting whatever the API happened to emit.
    studentEvaluations: sortEvaluationsLatestFirst(dashboard.studentEvaluations),
    upcomingExams: dashboard.upcomingExams,
    teachingByBatchId: new Map(
      dashboard.teaching.map(({ batchId, evaluations }) => [
        batchId,
        { evaluations: sortEvaluationsLatestFirst(evaluations) },
      ]),
    ),
    pastBatchesByStudentId: new Map(
      dashboard.pastBatchesByStudent.map(({ studentId, batches }) => [studentId, batches]),
    ),
  }
}
