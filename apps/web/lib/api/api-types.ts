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
  memberships: { organizationId: string; organizationName: string; organizationSlug: string; role: string }[]
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
  // A student can self-enroll (POST /batches/:batchId/enroll) only while the batch is open:
  // `enrollmentOpensAt` set and in the past, and `enrollmentClosesAt` either null (open-ended) or
  // still in the future. `enrollmentOpensAt: null` means never open. No seat cap — every open
  // batch takes any number of students.
  enrollmentOpensAt: string | null
  enrollmentClosesAt: string | null
}

export type ApiBatchDetail = ApiBatch & { members: ApiBatchMember[]; classSlots: ApiClassSlot[] }
// `enrollmentStatus` is the caller's own enrollment status in this batch — distinct from `status`
// (the batch's own upcoming/active/completed) — used to tell a live seat apart from a batch the
// caller was once in but is now on a break from, dropped, or otherwise inactive in.
export type ApiBatchWithRole = ApiBatchDetail & {
  role: ApiEnrollmentRole | null
  enrollmentStatus: ApiEnrollmentStatus | null
}

// GET /v1/batches/open — a student's own "batches I can join" view: schedule, never the roster
// (unlike ApiBatchDetail).
export type ApiOpenBatch = ApiBatch & {
  trackName: string
  classSlots: ApiClassSlot[]
}

export type ApiProficiencyLevel =
  | 'notStarted'
  | 'absent'
  | 'practicing'
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

export type ApiExam = {
  id: string
  chapterId: string
  studentId: string
  scheduledAt: string
  status: 'scheduled' | 'inProgress' | 'completed' | 'cancelled'
  evaluationId: string | null
  performedAt: string | null
  chapter: { id: string; code: string; title: string; trackId: string }
  evaluation: { level: ApiProficiencyLevel; notes: string | null } | null
}

// A track's certification result — decoupled from `chapter` (packages/db/src/schema/school.ts's
// `trackCertification` table). Full history like ApiEvaluation, not deduped to "current".
export type ApiTrackCertification = {
  id: string
  trackId: string
  studentId: string
  level: ApiProficiencyLevel
  notes: string | null
  evaluatorId: string
  evaluatedAt: string | null
}

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
  yearOfBirth: number | null
  phone: string
  email: string | null
  city: string | null
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
  certifications: ApiTrackCertification[]
  upcomingExams: ApiExam[]
  teaching: { batchId: string; evaluations: ApiEvaluation[] }[]
  pastBatchesByStudent: { studentId: string; batches: ApiBatch[] }[]
}

// GET /v1/profiles/:profileId/detail — the profile page's data: full contact/background detail
// plus the same track/exam-history shape the dashboard already assembles for "self," reused here
// for any profile the caller is allowed to view (self, a teacher sharing a batch, or an admin).
export type ApiProfileDetail = {
  profile: ApiProfile
  dashboard: ApiDashboard
}
