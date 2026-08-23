import type { ProficiencyLevel } from '@/lib/proficiency'

export type ApiProfile = {
  id: string
  name: string
  phone: string | null
  city: string | null
  createdAt: string
  updatedAt: string
}

// The org-level role (owner/admin/member), distinct from a profile's per-batch EnrollmentRole.
// Only fetch this for one-off authorization checks (e.g. gating /admin) — never on a hot path
// that runs on every dashboard load, which is what caused a production incident previously.
export type ApiAuthProfile = {
  isSuperAdmin: boolean
  memberships: { organizationId: string; organizationName: string; organizationSlug: string; role: string }[]
}

export type ApiPage<T> = {
  items: T[]
  nextCursor: string | null
}

export type ApiChapter = {
  id: string
  trackId: string
  code: string
  title: string
  status: 'draft' | 'published'
  order: number
  script: 'te' | 'sa' | 'en' | null
}

export type ApiTrack = {
  id: string
  name: string
  order: number
  chapters: ApiChapter[]
}

export type BatchStatus = 'upcoming' | 'active' | 'completed'

export type ApiBatch = {
  id: string
  trackId: string
  code: string
  status: BatchStatus
  startDate: string | null
  meetingUrl: string | null
}

export type EnrollmentRole = 'instructor' | 'ta' | 'student'

export type ApiBatchMember = {
  profileId: string
  name: string
  phone: string | null
  city: string | null
  role: EnrollmentRole
  joinedAt: string | null
}

export type ApiClassSlot = {
  dayOfWeek: number
  time: string
  durationMinutes: number
}

export type ApiBatchDetail = ApiBatch & {
  members: ApiBatchMember[]
  classSlots: ApiClassSlot[]
}

// A batch detail annotated with the caller's own role in it — null when the caller has
// school-wide (admin/owner) access but no personal enrollment row for that batch.
export type ApiBatchWithRole = ApiBatchDetail & { role: EnrollmentRole | null }

export type ApiEvaluation = {
  id: string
  studentId: string
  chapterId: string
  level: ProficiencyLevel
  notes: string | null
  evaluatorId: string
  evaluatedAt: string | null
}

export type ExamStatus = 'scheduled' | 'inProgress' | 'completed' | 'cancelled'

export type ApiExam = {
  id: string
  chapterId: string
  studentId: string
  scheduledAt: string
  status: ExamStatus
  evaluationId: string | null
  performedAt: string | null
  chapter: { id: string; code: string; title: string; trackId: string }
  evaluation: { level: ProficiencyLevel; notes: string | null } | null
}

// GET /me/dashboard's response — everything the dashboard needs, assembled server-side in one
// request instead of one HTTP round-trip per batch/student. `memberships` is flat
// (ApiBatchWithRole), matching GET /profiles/:id/batches?withDetail=true's shape; `teaching` and
// `pastBatchesByStudent` are arrays (not maps) since Maps don't survive JSON — reconstruct on the
// client.
export type ApiDashboard = {
  firstName: string
  memberships: ApiBatchWithRole[]
  tracks: ApiTrack[]
  studentEvaluations: ApiEvaluation[]
  upcomingExams: ApiExam[]
  teaching: { batchId: string; evaluations: ApiEvaluation[] }[]
  pastBatchesByStudent: { studentId: string; batches: ApiBatch[] }[]
}
