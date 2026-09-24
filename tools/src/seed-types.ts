// The rows parse-excel-to-json.ts writes to seed-data/<school>/*.json and import-school.ts reads.
// Each one matches its database table (packages/db/src/schema/school.ts, plus `user`) so the importer
// inserts them almost as they are. This file has no runtime code: both sides `import type` from it.

export type ProficiencyLevel =
  | 'absent'
  | 'notStarted'
  | 'practicing'
  | 'level0'
  | 'level1'
  | 'level2'
  | 'level3'
  | 'level4'

export type CourseRow = { slug: string; name: string }
export type TrackRow = { id: string; courseSlug: string; name: string; order: number }
export type ChapterRow = {
  id: string
  trackId: string
  code: string
  title: string
  status: 'draft' | 'published'
  order: number
  script: 'te' | 'sa' | 'en' | null
}
export type BatchRow = {
  id: string
  trackId: string
  code: string
  status: 'upcoming' | 'active' | 'completed'
  startDate: string | null
  meetingUrl: string | null
}
export type UserRow = {
  id: string
  name: string
  email: string
  isSuperAdmin: false
  phoneNumber: string
  phoneNumberVerified: boolean
}

/** What one person's registration row says about them; `profile` and `registration` both carry it. */
export type PersonFields = {
  email: string | null
  yearOfBirth: number
  countryTimeZone: string | null
  learningGoal: string | null
  currentProficiency: ProficiencyLevel | null
  spokenLanguages: string[]
  readLanguages: string[]
  parentNames: string[]
  dressCodeAgreed: boolean
  noMeatAgreed: boolean
  noAlcoholAgreed: boolean
  noSmokingAgreed: boolean
  comments: string | null
}

export type ProfileRow = PersonFields & {
  id: string
  userId: string
  name: string
  phone: string
  city: string | null
  /** The spreadsheet PRIMARY KEY this profile came from — audit only, not a DB column. */
  sourceKey: string
}

/** Every registration-sheet row is an admitted person, so it imports as an approved registration. */
export type RegistrationRow = PersonFields & {
  id: string
  courseSlug: string
  profileId: string
  sourceKey: string
  registeredYear: number | null
  firstName: string
  lastName: string
  /** E.164 */
  phone: string
  city: string | null
}

export type EnrollmentRow = {
  profileId: string
  batchId: string
  role: 'instructor' | 'ta' | 'student'
  status: 'active' | 'break'
  joinedAt: string | null
}

export type EvaluationRow = {
  id: string
  studentId: string
  chapterId: string
  level: ProficiencyLevel
  evaluatorId: string
}

/**
 * A completed certification sitting: one student, one track. The workbooks carry no exam date, so
 * there is none here; the importer stamps the time of import. `childrenBonus` and `total` are what
 * the sheet certified — the importer records the exam through the API, which derives its own, and
 * refuses to write if the two differ.
 */
export type ExamRow = {
  id: string
  trackId: string
  studentId: string
  marks: {
    aksharaShuddhi: number
    swaraShuddhi: number
    niyantranaAnargalata: number
    shraavyata: number
    pratishakyaGrammar: number
  }
  childrenBonus: number
  total: number
  evaluatorId: string
}

/** A place in a workbook: the sheet and the Excel row number (1-based, as Excel shows it). */
export type Where = { sheet: string; row?: number; key?: string }

/**
 * What the parser found in one workbook. `blocking` rows cannot be loaded as written, and the
 * importer refuses to run until the spreadsheet is fixed. The rest are judgement calls the parser
 * made, listed so nothing is dropped or reinterpreted silently.
 */
export type Report = {
  school: string
  blocking: (Where & { message: string })[]
  /** A person listed as guru and student of one batch, or in two guru roles — one role kept. */
  enrollmentRoleOverrides: { profileKey: string; batchCode: string; kept: string; dropped: string }[]
  /** A batch whose code has no track (a remedial or teachers' batch) and was put on the final track. */
  batchCodeAssumptions: { batchCode: string; reason: string }[]
  /** A batch whose guru columns differ between its own student rows; every person named is enrolled. */
  guruDisagreements: { batchCode: string; column: string; values: string[] }[]
  /** Mark-sheet rows with a person but no marks: an exam not yet sat, not a result. */
  examRowsNotSat: Where[]
}

/** Everything one school's import needs. */
export type Dataset = {
  courses: CourseRow[]
  tracks: TrackRow[]
  chapters: ChapterRow[]
  batches: BatchRow[]
  users: UserRow[]
  profiles: ProfileRow[]
  registrations: RegistrationRow[]
  enrollments: EnrollmentRow[]
  evaluations: EvaluationRow[]
  exams: ExamRow[]
}
