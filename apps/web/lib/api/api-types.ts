/**
 * The subset of apps/api's real response shapes this workspace's real fetchers need.
 * Mirrors apps/web/lib/types.ts (the live app's own copy of the same contract) rather than
 * importing it — web-next is a standalone package with its own dependency graph.
 */

// GET /v1/profiles — every profile the signed-in account can act as (see app/login/page.tsx's own
// doc comment on why a household can have several).
//
// The fields from `email` through `comments` mirror `ApiRegistration`'s own fields exactly:
// apps/api's `registrations/service.ts::provisionApprovedApplicant` copies an approved
// application's full detail onto the profile it creates, so `profile` is the living record —
// `registration` stays an immutable snapshot of what was originally submitted. A profile created
// directly (no registration behind it) simply carries the null/empty defaults for all of them.
export type ApiProfile = {
  id: string
  name: string
  phone: string | null
  city: string | null
  email: string | null
  yearOfBirth: number | null
  // ISO 3166-2 subdivision code and ISO 3166-1 alpha-2 country code (see `lib/geo.ts` for turning
  // these into display names or picker options).
  state: string | null
  country: string | null
  // An IANA zone id, server-derived from city/state/country — never directly editable. Format for
  // display with `lib/timezone.ts::formatTimeZone` rather than rendering the raw id.
  countryTimeZone: string | null
  learningGoal: string | null
  currentProficiency: ApiProficiencyLevel | null
  spokenLanguages: string[]
  readLanguages: string[]
  parentNames: string[]
  dressCodeAgreed: boolean
  noMeatAgreed: boolean
  noAlcoholAgreed: boolean
  noSmokingAgreed: boolean
  comments: string | null
  createdAt: string
  updatedAt: string
}

// GET /v1/profile (singular) — the signed-in *account*'s own authorization facts: global
// super-admin, plus its org-level role in every school it belongs to. Distinct from `ApiProfile`
// above, which is a business entity (a student/teacher record) the account can act as — this is
// about the account itself, and is what gates the admin views (see
// `lib/auth/profile-store.ts`'s `useHasAdminAccess`).
export type ApiAuthProfile = {
  isSuperAdmin: boolean
  memberships: {
    organizationId: string
    organizationName: string
    organizationSlug: string
    role: string
  }[]
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

// GET /v1/chapters/:chapterId — the heavier response only this one endpoint returns; `ApiChapter`
// above (embedded in every track on every dashboard load) deliberately stays thin so a dashboard
// load never eagerly fetches and signs every chapter's content.
export type ApiScriptKey = 'te' | 'sa' | 'en'

export type ApiScriptSegment = { id: string; start: number; end: number }

// One parallel script of a chapter's recitation — segments share ids with the chapter's other
// scripts, each carrying this script's own offsets into this script's own `text`, which is what
// lets a script switch keep its place in the audio.
export type ApiScriptText = {
  key: ApiScriptKey
  label: string
  short: string
  fontClass: string
  text: string
  segments: ApiScriptSegment[]
}

export type ApiAudioMapping = { segmentId: string; audioStart: number; audioEnd: number }

export type ApiAudioAsset = {
  id: string
  label: string | null
  reciter: string
  duration: number
  // Signed R2 download URL — the object key itself never reaches the client.
  url: string
  mappings: ApiAudioMapping[]
}

export type ApiChapterDetail = ApiChapter & {
  scripts: ApiScriptText[]
  audio: ApiAudioAsset[]
}

// GET /v1/courses — a school runs one or more courses (Vedam, Smartam, ...), each under its
// own path: `slug` is the first path segment (`<school>.naradas.app/vedam/…`).
export type ApiCourse = {
  id: string
  slug: string
  name: string
}

export type ApiTrack = {
  id: string
  name: string
  order: number
  chapters: ApiChapter[]
}

export type ApiBatchStatus = 'upcoming' | 'active' | 'completed'
export type ApiEnrollmentRole = 'instructor' | 'ta' | 'student'
export type ApiEnrollmentStatus = 'active' | 'break' | 'dropped' | 'inactive'

export type ApiClassSlot = { dayOfWeek: number; time: string; durationMinutes: number }

export type ApiBatchMember = {
  profileId: string
  name: string
  phone: string | null
  email: string | null
  city: string | null
  role: ApiEnrollmentRole
  joinedAt: string | null
  // This member's own enrollment status in this batch — see reshape.ts's `buildRoster`, the one
  // place that reads it (to drop a student put on a break off the mark book).
  status: ApiEnrollmentStatus
}

export type ApiBatch = {
  id: string
  trackId: string
  code: string
  status: ApiBatchStatus
  startDate: string | null
  meetingUrl: string | null
}

export type ApiBatchDetail = ApiBatch & { members: ApiBatchMember[]; classSlots: ApiClassSlot[] }
// `enrollmentStatus` is the caller's own enrollment status in this batch — distinct from `status`
// (the batch's own upcoming/active/completed) — used to tell a live seat apart from a batch the
// caller was once in but is now on a break from, dropped, or otherwise inactive in.
export type ApiBatchWithRole = ApiBatchDetail & {
  role: ApiEnrollmentRole | null
  enrollmentStatus: ApiEnrollmentStatus | null
}

// GET /v1/batches/open — a student's own "batches I can request to join" view (any batch not
// marked completed — POST /batches/:batchId/enroll files a request, apps/api/src/enrollmentRequests
// — with the schedule, never the roster (unlike ApiBatchDetail). `eligible` is whether the caller
// holds at least L1 on the track before this one (always true for a course's first track) — the
// server still enforces this on the POST itself, so `eligible` only drives the button up front.
export type ApiOpenBatch = ApiBatch & {
  trackName: string
  classSlots: ApiClassSlot[]
  eligible: boolean
}

export type ApiProficiencyLevel =
  | 'notStarted'
  | 'absent'
  | 'practicing'
  | 'level0'
  | 'level1'
  | 'level2'
  | 'level3'
  | 'level4'

export type ApiEvaluation = {
  id: string
  studentId: string
  chapterId: string
  level: ApiProficiencyLevel
  notes: string | null
  evaluatorId: string
  evaluatedAt: string | null
}

// How a certification exam came out — apps/api/src/exams/grading.ts owns the thresholds.
export type ApiExamOutcome =
  | 'reappear'
  | 'level1'
  | 'level2'
  | 'dwitiyaSreni'
  | 'prathamaSreni'
  | 'athiUttamam'

// The marks for one completed track exam (packages/db's `examResult`). `level` is what `outcome`
// grants, derived server-side — null for a `reappear`. `childrenBonus`, `total` and `outcome` are
// all derived server-side too; the evaluator only ever enters the five marks.
export type ApiExamResult = {
  examId: string
  aksharaShuddhi: number
  swaraShuddhi: number
  niyantranaAnargalata: number
  shraavyata: number
  pratishakyaGrammar: number
  childrenBonus: number
  total: number
  outcome: ApiExamOutcome
  level: ApiProficiencyLevel | null
  notes: string | null
  evaluatorId: string
  evaluatedAt: string
}

// A sitting is per track, not per chapter. `result` is null until it's graded.
export type ApiExam = {
  id: string
  trackId: string
  studentId: string
  batchId: string
  scheduledAt: string
  status: 'scheduled' | 'inProgress' | 'completed' | 'cancelled'
  track: { id: string; name: string }
  result: ApiExamResult | null
}

// One entry of the dashboard's `examResults` — a graded sitting, with the track it was on (the
// dashboard's list is flat across tracks). Full history like ApiEvaluation, newest first; a
// track's certification is the latest of these for it.
export type ApiStudentExamResult = ApiExamResult & { trackId: string }

// GET/POST /v1/registrations — a prospective student's application, filed before they have any
// account (see apps/api/src/registrations/schema.ts). `currentProficiency` reuses
// `ApiProficiencyLevel`, but a self-reported starting point never has a real reason to be
// `'absent'` (that value means "no evaluation exists," a teacher-side concept) — the registration
// form simply never offers it, rather than the type excluding it.
export type ApiRegistrationStatus = 'pending' | 'approved' | 'rejected'

export type ApiRegistration = {
  id: string
  status: ApiRegistrationStatus
  firstName: string
  lastName: string
  yearOfBirth: number
  phone: string
  email: string | null
  city: string | null
  state: string | null
  country: string | null
  countryTimeZone: string | null
  learningGoal: string | null
  currentProficiency: ApiProficiencyLevel | null
  spokenLanguages: string[]
  readLanguages: string[]
  parentNames: string[]
  dressCodeAgreed: boolean
  noMeatAgreed: boolean
  noAlcoholAgreed: boolean
  noSmokingAgreed: boolean
  comments: string | null
  reviewedAt: string | null
  reviewedBy: string | null
  createdAt: string
}

export type ApiDashboard = {
  firstName: string
  memberships: ApiBatchWithRole[]
  tracks: ApiTrack[]
  studentEvaluations: ApiEvaluation[]
  examResults: ApiStudentExamResult[]
  upcomingExams: ApiExam[]
  teaching: { batchId: string; evaluations: ApiEvaluation[] }[]
  pastBatchesByStudent: { studentId: string; batches: ApiBatch[] }[]
  pendingBatchIds: string[]
}

// GET/POST /v1/enrollment-requests — a student's request to join an open batch
// (POST /v1/batches/:batchId/enroll), awaiting an admin/instructor's approval before
// `enrollment/service.ts::enroll` actually seats them (see apps/api/src/enrollmentRequests/schema.ts).
export type ApiEnrollmentRequestStatus = 'pending' | 'approved' | 'rejected'

export type ApiEnrollmentRequest = {
  id: string
  status: ApiEnrollmentRequestStatus
  profileId: string
  studentName: string
  batchId: string
  batchCode: string
  trackName: string
  reviewedAt: string | null
  reviewedBy: string | null
  createdAt: string
}

// GET /v1/profiles/:profileId/detail — the profile page's data: full contact/background detail
// plus the same track/exam-history shape the dashboard already assembles for "self," reused here
// for any profile the caller is allowed to view (self, a teacher sharing a batch, or an admin).
export type ApiProfileDetail = {
  profile: ApiProfile
  dashboard: ApiDashboard
}
