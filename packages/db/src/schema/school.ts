import { sql } from 'drizzle-orm'
import {
  pgTable,
  pgEnum,
  text,
  integer,
  real,
  boolean,
  timestamp,
  time,
  uuid,
  index,
  primaryKey,
  uniqueIndex,
  foreignKey,
  check,
} from 'drizzle-orm/pg-core'
import { uuidv7 } from '../ids'
import { COURSE_SLUG_PATTERN, RESERVED_COURSE_SLUGS } from '../courseSlug'

// Declared before `profile` (below) since `profile.currentProficiency` references it — a pgEnum
// value must exist before a pgTable call closes over it.
export const proficiencyLevel = pgEnum('proficiencyLevel', [
  'absent',
  'notStarted',
  'practicing',
  'level0',
  'level1',
  'level2',
  'level3',
  'level4',
])

export const profile = pgTable(
  'profile',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    userId: text('userId').notNull(),
    name: text('name').notNull(),
    phone: text('phone'),
    city: text('city'),
    // The rest of these mirror `registration`'s own columns exactly (same names/types):
    // `registrations/service.ts::provisionApprovedApplicant` copies them straight across when an
    // application is approved, so `profile` becomes the living record of a student's contact and
    // background details — `registration` stays an immutable snapshot of what was submitted.
    // Null/empty-default for every one of these so a profile created directly via `POST /profiles`
    // (no registration behind it) stays valid.
    email: text('email'),
    yearOfBirth: integer('yearOfBirth'),
    // ISO 3166-2 subdivision code (e.g. 'MA', 'TG') and ISO 3166-1 alpha-2 country code (e.g.
    // 'US', 'IN') — codes rather than display names so `country-state-city` can re-derive a
    // human-readable name ("Massachusetts", "India") and the coordinates `utils/timezone.ts`
    // needs, from a stable identifier that never drifts with spelling/casing. `state` is null for
    // a country with no formal subdivisions in that dataset.
    state: text('state'),
    country: text('country'),
    // An IANA identifier (e.g. 'America/New_York'), never client-supplied directly — derived
    // server-side from city/state/country by `utils/timezone.ts::deriveTimeZone` whenever any of
    // those change (see `profiles/service.ts::updateProfile`). Display formatting (offset,
    // abbreviation) happens at render time so it's always correct for the current DST state,
    // rather than baked into the stored string.
    countryTimeZone: text('countryTimeZone'),
    learningGoal: text('learningGoal'),
    currentProficiency: proficiencyLevel('currentProficiency'),
    spokenLanguages: text('spokenLanguages').array().notNull().default([]),
    readLanguages: text('readLanguages').array().notNull().default([]),
    parentNames: text('parentNames').array().notNull().default([]),
    dressCodeAgreed: boolean('dressCodeAgreed').notNull().default(false),
    noMeatAgreed: boolean('noMeatAgreed').notNull().default(false),
    noAlcoholAgreed: boolean('noAlcoholAgreed').notNull().default(false),
    noSmokingAgreed: boolean('noSmokingAgreed').notNull().default(false),
    comments: text('comments'),
    // Soft-delete marker (DD-011): NULL = active. Deliberately has no `.$onUpdateFn` —
    // unlike `updatedAt`, this is set exactly once, explicitly, by the soft-delete write,
    // and must never be auto-touched by an unrelated UPDATE.
    deletedAt: timestamp('deletedAt'),
    updatedAt: timestamp('updatedAt')
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  table => [index('profile_userId_idx').on(table.userId)],
)

export type SchoolProfile = typeof profile.$inferSelect

export const chapterStatus = pgEnum('chapterStatus', ['draft', 'published'])
export const script = pgEnum('script', ['te', 'sa', 'en'])
export const batchStatus = pgEnum('batchStatus', ['upcoming', 'active', 'completed'])
export const enrollmentRole = pgEnum('enrollmentRole', ['instructor', 'ta', 'student'])
export const enrollmentStatus = pgEnum('enrollmentStatus', [
  'active',
  'break',
  'dropped',
  'inactive',
])
export const enrollmentRequestStatus = pgEnum('enrollmentRequestStatus', [
  'pending',
  'approved',
  'rejected',
])
export const examStatus = pgEnum('examStatus', [
  'scheduled',
  'inProgress',
  'completed',
  'cancelled',
])
// How a certification exam came out, from its total (apps/api/src/exams/grading.ts owns the
// thresholds). Ordered worst to best. `dwitiyaSreni`/`prathamaSreni`/`athiUttamam` are the
// named distinctions for L3/L4/L4-with-honours; `level1`/`level2` are unnamed passes; `reappear`
// is a fail, which grants no level.
export const examOutcome = pgEnum('examOutcome', [
  'reappear',
  'level1',
  'level2',
  'dwitiyaSreni',
  'prathamaSreni',
  'athiUttamam',
])
// A slot's own lifecycle, independent of any exam it eventually produces. 'open' accepts requests;
// a request moves it to 'requested' (single-seat, so it stops taking new ones) until that request
// is approved (→ 'booked', and the real `exam` row now exists) or rejected (→ back to 'open', so
// the slot isn't stuck). 'cancelled' is an admin withdrawing it outright — terminal, whether or not
// it ever had a request.
export const examSlotStatus = pgEnum('examSlotStatus', ['open', 'requested', 'booked', 'cancelled'])

export const examSlotRequestStatus = pgEnum('examSlotRequestStatus', [
  'pending',
  'approved',
  'rejected',
])

export const registrationStatus = pgEnum('registrationStatus', ['pending', 'approved', 'rejected'])

// A school runs one or more courses (Vedam, Smartam, ...). A course owns its tracks, and through
// them its chapters, batches, exams and evaluations — those all reach their course via
// `track.courseId`. Courses are seeded, not managed from the app. `slug` is the course's place in the
// URL (`slmts.naradas.app/vedam/dashboard`), which the web app sends as the `x-course-slug` header —
// so it has to be a safe URL segment and can't be a word the web app already uses at the top level
// (see courseSlug.ts).
export const course = pgTable(
  'course',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
  },
  table => [
    check(
      'course_slug_valid',
      sql`${table.slug} ~ ${sql.raw(`'${COURSE_SLUG_PATTERN}'`)} AND ${table.slug} NOT IN (${sql.raw(
        RESERVED_COURSE_SLUGS.map(word => `'${word}'`).join(', '),
      )})`,
    ),
  ],
)

export const track = pgTable(
  'track',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    courseId: uuid('courseId')
      .notNull()
      .references(() => course.id),
    name: text('name').notNull(),
    order: integer('order').notNull(),
  },
  table => [
    // Tracks are ordered within their course, so two courses can each have a "track 1".
    uniqueIndex('track_courseId_order_uidx').on(table.courseId, table.order),
    // Not a second uniqueness rule (`id` is already unique) — the target `batch`'s composite
    // foreign key needs, so a batch's course can never disagree with its track's.
    uniqueIndex('track_id_courseId_uidx').on(table.id, table.courseId),
  ],
)

export const chapter = pgTable(
  'chapter',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    trackId: uuid('trackId')
      .notNull()
      .references(() => track.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    title: text('title').notNull(),
    status: chapterStatus('status').notNull().default('draft'),
    order: integer('order').notNull(),
    script: script('script'),
    // Distinct from `status`: a `status` transition (draft ↔ published) stays visible to an
    // admin in the catalog; `archived` hides the row from every view (see `chapters/service.ts`'s
    // `updateChapter` doc comment) without deleting it, since real `evaluation`/`exam` rows can
    // reference this chapter's id and a hard delete would orphan them.
    archived: boolean('archived').notNull().default(false),
  },
  table => [
    index('chapter_trackId_idx').on(table.trackId),
    uniqueIndex('chapter_trackId_code_uidx').on(table.trackId, table.code),
    uniqueIndex('chapter_trackId_order_uidx').on(table.trackId, table.order),
  ],
)

// A chapter's recitation, written out in parallel scripts (Devanagari, Telugu, transliteration —
// same recitation, different readers). Segments (below) are shared across a chapter's scripts by
// id; this table only holds each script's own text and label, not offsets into it.
export const chapterScript = pgTable(
  'chapterScript',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    chapterId: uuid('chapterId')
      .notNull()
      .references(() => chapter.id, { onDelete: 'cascade' }),
    script: script('script').notNull(),
    label: text('label').notNull(),
    shortLabel: text('shortLabel').notNull(),
    fontClass: text('fontClass').notNull(),
    text: text('text').notNull(),
    order: integer('order').notNull(),
  },
  table => [
    index('chapterScript_chapterId_idx').on(table.chapterId),
    uniqueIndex('chapterScript_chapterId_script_uidx').on(table.chapterId, table.script),
  ],
)

// One logical line of a chapter's recitation — the identity a chapter's several scripts share, so
// one `audioMapping` row stays valid no matter which script is on screen. Carries no offsets of
// its own: `chapterScriptSegment` gives each script its own slice into its own text for the same
// segment, since a Devanagari line and its Telugu/transliteration equivalent aren't the same
// length.
export const segment = pgTable(
  'segment',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    chapterId: uuid('chapterId')
      .notNull()
      .references(() => chapter.id, { onDelete: 'cascade' }),
    order: integer('order').notNull(),
  },
  table => [
    index('segment_chapterId_idx').on(table.chapterId),
    uniqueIndex('segment_chapterId_order_uidx').on(table.chapterId, table.order),
  ],
)

export const chapterScriptSegment = pgTable(
  'chapterScriptSegment',
  {
    chapterScriptId: uuid('chapterScriptId')
      .notNull()
      .references(() => chapterScript.id, { onDelete: 'cascade' }),
    segmentId: uuid('segmentId')
      .notNull()
      .references(() => segment.id, { onDelete: 'cascade' }),
    start: integer('start').notNull(),
    end: integer('end').notNull(),
  },
  table => [
    primaryKey({ columns: [table.chapterScriptId, table.segmentId] }),
    check('chapterScriptSegment_bounds_valid', sql`${table.start} < ${table.end}`),
  ],
)

export const audioAsset = pgTable(
  'audioAsset',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    chapterId: uuid('chapterId')
      .notNull()
      .references(() => chapter.id, { onDelete: 'cascade' }),
    label: text('label'),
    reciter: text('reciter').notNull(),
    objectKey: text('objectKey').notNull(),
    duration: real('duration').notNull(),
    order: integer('order').notNull(),
  },
  table => [
    index('audioAsset_chapterId_idx').on(table.chapterId),
    uniqueIndex('audioAsset_chapterId_objectKey_uidx').on(table.chapterId, table.objectKey),
  ],
)

export const audioMapping = pgTable(
  'audioMapping',
  {
    segmentId: uuid('segmentId')
      .notNull()
      .references(() => segment.id, { onDelete: 'cascade' }),
    audioAssetId: uuid('audioAssetId')
      .notNull()
      .references(() => audioAsset.id, { onDelete: 'cascade' }),
    audioStart: real('audioStart').notNull(),
    audioEnd: real('audioEnd').notNull(),
  },
  table => [
    primaryKey({ columns: [table.segmentId, table.audioAssetId] }),
    check('audioMapping_bounds_valid', sql`${table.audioStart} < ${table.audioEnd}`),
  ],
)

export const stagedUploadPurpose = pgEnum('stagedUploadPurpose', ['audio'])
export const stagedUploadStatus = pgEnum('stagedUploadStatus', ['pending', 'completed', 'expired'])

// A presigned-upload bookkeeping row: created at presign time (before the client has actually put
// any bytes in R2), confirmed once the object is verified to exist. No `schoolId` column — unlike
// the single-schema design this is ported from, `SchoolDb`/`SchoolDbClient` are already scoped to
// one tenant's Postgres schema, so that isolation is automatic here.
export const stagedUpload = pgTable(
  'stagedUpload',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    chapterId: uuid('chapterId')
      .notNull()
      .references(() => chapter.id, { onDelete: 'cascade' }),
    purpose: stagedUploadPurpose('purpose').notNull(),
    status: stagedUploadStatus('status').notNull().default('pending'),
    objectKey: text('objectKey').notNull(),
    contentType: text('contentType').notNull(),
    createdByUserId: text('createdByUserId').notNull(),
    expiresAt: timestamp('expiresAt').notNull(),
    completedAt: timestamp('completedAt'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  table => [
    index('stagedUpload_chapterId_idx').on(table.chapterId),
    index('stagedUpload_status_expiresAt_idx').on(table.status, table.expiresAt),
  ],
)

// `courseId` duplicates what `trackId` already implies, on purpose: `enrollment` needs the course
// on its own row for the one-active-seat-per-course index below, and a copy is only safe if the
// database refuses to let it drift. The composite foreign key does that — a batch can only carry
// the course its track belongs to — and `enrollment` does the same against this table.
export const batch = pgTable(
  'batch',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    trackId: uuid('trackId')
      .notNull()
      .references(() => track.id),
    courseId: uuid('courseId').notNull(),
    code: text('code').notNull().unique(),
    status: batchStatus('status').notNull().default('upcoming'),
    startDate: timestamp('startDate'),
    meetingUrl: text('meetingUrl'),
  },
  table => [
    foreignKey({
      name: 'batch_trackId_courseId_fk',
      columns: [table.trackId, table.courseId],
      foreignColumns: [track.id, track.courseId],
    }),
    uniqueIndex('batch_id_courseId_uidx').on(table.id, table.courseId),
    index('batch_courseId_idx').on(table.courseId),
  ],
)

// A batch typically meets multiple times a week (e.g. Mon/Wed/Fri), each potentially at a
// different time — a one-to-many child table rather than array columns on `batch`.
export const batchClassSlot = pgTable(
  'batchClassSlot',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    batchId: uuid('batchId')
      .notNull()
      .references(() => batch.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('dayOfWeek').notNull(), // 0 = Sunday .. 6 = Saturday (matches Date#getDay())
    time: time('time').notNull(),
    durationMinutes: integer('durationMinutes').notNull(),
  },
  table => [
    index('batchClassSlot_batchId_idx').on(table.batchId),
    uniqueIndex('batchClassSlot_batchId_dayOfWeek_uidx').on(table.batchId, table.dayOfWeek),
  ],
)

export const enrollment = pgTable(
  'enrollment',
  {
    profileId: uuid('profileId')
      .notNull()
      .references(() => profile.id, { onDelete: 'cascade' }),
    batchId: uuid('batchId')
      .notNull()
      .references(() => batch.id, { onDelete: 'cascade' }),
    // Always the course of `batchId`'s batch — enforced by the composite foreign key below, so
    // callers copy it from the batch and can never get it wrong.
    courseId: uuid('courseId').notNull(),
    role: enrollmentRole('role').notNull(),
    status: enrollmentStatus('status').notNull().default('active'),
    joinedAt: timestamp('joinedAt').defaultNow(),
    leftDate: timestamp('leftDate'),
  },
  table => [
    primaryKey({ columns: [table.profileId, table.batchId] }),
    index('enrollment_batchId_idx').on(table.batchId),
    foreignKey({
      name: 'enrollment_batchId_courseId_fk',
      columns: [table.batchId, table.courseId],
      foreignColumns: [batch.id, batch.courseId],
    }).onDelete('cascade'),
    // A student holds at most one live batch per course. Only an `active` student seat counts:
    // `break`, `dropped` and `inactive` mean "not currently in any batch", and a batch being marked
    // completed moves its active students to `inactive` (batches/service.ts), so a finished batch
    // frees the seat. Instructors and TAs are exempt — they can teach several batches at once.
    uniqueIndex('enrollment_one_active_student_seat_per_course')
      .on(table.profileId, table.courseId)
      .where(sql`${table.role} = 'student' AND ${table.status} = 'active'`),
  ],
)

// A student's request to join a batch (POST /batches/:batchId/enroll) — an admin/instructor must
// approve it before `enrollment/service.ts::enroll` actually seats them. Kept as its own table
// rather than an `enrollment` row with a 'pending' status: a still-pending request must never
// satisfy the "does this profile hold a live (or any) enrollment" queries the rest of the schema
// already relies on (e.g. `enrollment/repository.ts::findQualifyingBatches`), which don't filter
// on `enrollment.status`. Unlike `registration` (a prospective student with no account yet), the
// requester already has a `profile` — approving or rejecting just decides whether they get seated.
export const enrollmentRequest = pgTable(
  'enrollmentRequest',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    status: enrollmentRequestStatus('status').notNull().default('pending'),
    profileId: uuid('profileId')
      .notNull()
      .references(() => profile.id, { onDelete: 'cascade' }),
    batchId: uuid('batchId')
      .notNull()
      .references(() => batch.id, { onDelete: 'cascade' }),
    reviewedAt: timestamp('reviewedAt'),
    reviewedBy: uuid('reviewedBy').references(() => profile.id),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  table => [
    index('enrollmentRequest_status_createdAt_idx').on(table.status, table.createdAt),
    index('enrollmentRequest_batchId_idx').on(table.batchId),
  ],
)

export const evaluation = pgTable(
  'evaluation',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    studentId: uuid('studentId')
      .notNull()
      .references(() => profile.id, { onDelete: 'cascade' }),
    chapterId: uuid('chapterId')
      .notNull()
      .references(() => chapter.id),
    level: proficiencyLevel('level').notNull(),
    notes: text('notes'),
    evaluatorId: uuid('evaluatorId')
      .notNull()
      .references(() => profile.id, { onDelete: 'restrict' }),
    evaluatedAt: timestamp('evaluatedAt').defaultNow(),
    batchId: uuid('batchId').references(() => batch.id),
  },
  table => [
    index('evaluation_studentId_chapterId_idx').on(table.studentId, table.chapterId),
    index('evaluation_batchId_studentId_idx').on(table.batchId, table.studentId),
  ],
)

// A certification exam sitting: one student, one track, booked into the batch they're enrolled in
// for it (`batchId` is resolved once at creation and kept as immutable assessment context — see
// exams/service.ts). The sitting is per track, not per chapter: it certifies the whole syllabus.
// What it scored lives in `examResult`, written in the same transaction that completes the exam.
export const exam = pgTable(
  'exam',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    trackId: uuid('trackId')
      .notNull()
      .references(() => track.id),
    studentId: uuid('studentId')
      .notNull()
      .references(() => profile.id, { onDelete: 'cascade' }),
    batchId: uuid('batchId')
      .notNull()
      .references(() => batch.id),
    scheduledAt: timestamp('scheduledAt').notNull(),
    status: examStatus('status').notNull().default('scheduled'),
  },
  table => [
    index('exam_trackId_idx').on(table.trackId),
    index('exam_studentId_idx').on(table.studentId),
    index('exam_batchId_studentId_idx').on(table.batchId, table.studentId),
  ],
)

// The marks for one completed exam — exactly one row per `completed` exam, none for any other
// status, so every column here is mandatory (a scheduled exam simply has no row). This replaces
// the old `trackCertification` table: a student's certification on a track is now their latest
// `examResult` there (apps/api/src/exams/repository.ts), backed by real marks rather than a bare
// level. `total` and `outcome` are snapshots taken at recording time, so revising the grading
// thresholds later never rewrites a past result. The bounds below mirror the exam's mark
// sheet; `childrenBonus` is derived from the student's year of birth, never entered.
export const examResult = pgTable(
  'examResult',
  {
    examId: uuid('examId')
      .primaryKey()
      .references(() => exam.id, { onDelete: 'cascade' }),
    aksharaShuddhi: integer('aksharaShuddhi').notNull(),
    swaraShuddhi: integer('swaraShuddhi').notNull(),
    niyantranaAnargalata: integer('niyantranaAnargalata').notNull(),
    shraavyata: integer('shraavyata').notNull(),
    pratishakyaGrammar: integer('pratishakyaGrammar').notNull(),
    childrenBonus: integer('childrenBonus').notNull(),
    total: integer('total').notNull(),
    outcome: examOutcome('outcome').notNull(),
    notes: text('notes'),
    evaluatorId: uuid('evaluatorId')
      .notNull()
      .references(() => profile.id, { onDelete: 'restrict' }),
    evaluatedAt: timestamp('evaluatedAt').notNull().defaultNow(),
  },
  table => [
    check('examResult_aksharaShuddhi_range', sql`${table.aksharaShuddhi} BETWEEN 0 AND 50`),
    check('examResult_swaraShuddhi_range', sql`${table.swaraShuddhi} BETWEEN 0 AND 30`),
    check(
      'examResult_niyantranaAnargalata_range',
      sql`${table.niyantranaAnargalata} BETWEEN 0 AND 20`,
    ),
    check('examResult_shraavyata_range', sql`${table.shraavyata} BETWEEN 0 AND 5`),
    check('examResult_pratishakyaGrammar_range', sql`${table.pratishakyaGrammar} BETWEEN 0 AND 5`),
    check('examResult_childrenBonus_values', sql`${table.childrenBonus} IN (0, 5, 10)`),
    check(
      'examResult_total_is_sum',
      sql`${table.total} = ${table.aksharaShuddhi} + ${table.swaraShuddhi} + ${table.niyantranaAnargalata} + ${table.shraavyata} + ${table.pratishakyaGrammar} + ${table.childrenBonus}`,
    ),
    index('examResult_evaluatorId_idx').on(table.evaluatorId),
  ],
)

// A school-admin-opened appointment a student can ask to sit a track's certification exam in —
// single-seat, so booking it is a claim on the one seat, not a capacity decrement. Independent of
// `batch`/`enrollment`: the qualifying batch is only resolved (same as direct exam creation,
// `enrollment/service.ts::resolveQualifyingBatch`) once a request on this slot is approved and the
// real `exam` row is written — a slot by itself doesn't know or care which batch its eventual
// sitting will land in.
export const examSlot = pgTable(
  'examSlot',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    trackId: uuid('trackId')
      .notNull()
      .references(() => track.id),
    scheduledAt: timestamp('scheduledAt').notNull(),
    status: examSlotStatus('status').notNull().default('open'),
    openedBy: uuid('openedBy')
      .notNull()
      .references(() => profile.id, { onDelete: 'restrict' }),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  table => [
    // The core query for both "open slots a student can request" and an admin's slot list: a
    // track's slots, filtered by status, soonest first.
    index('examSlot_trackId_status_scheduledAt_idx').on(
      table.trackId,
      table.status,
      table.scheduledAt,
    ),
    // Not a second uniqueness rule (`id` is already unique) — the target `examSlotRequest`'s
    // composite foreign key needs, so its copy of `trackId` can never drift from the slot it's
    // actually requesting (mirrors `track_id_courseId_uidx` doing the same for `batch`).
    uniqueIndex('examSlot_id_trackId_uidx').on(table.id, table.trackId),
  ],
)

// A student's request to claim an open `examSlot` — mirrors `enrollmentRequest`'s shape
// (pending/approved/rejected + reviewedAt/reviewedBy) for the same reason: the request must exist,
// and be visible to an admin, before the thing it asks for (a real `exam` row) does. `examId` is
// filled in only on approval, the same way `registration.convertedProfileId` records what a
// registration turned into without the target table needing to know it came from a request.
export const examSlotRequest = pgTable(
  'examSlotRequest',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    slotId: uuid('slotId')
      .notNull()
      .references(() => examSlot.id, { onDelete: 'cascade' }),
    // Always the track of `slotId`'s slot — enforced by the composite foreign key below, copied
    // here so "one pending request per student per track" (below) doesn't need to join through
    // examSlot to check it.
    trackId: uuid('trackId').notNull(),
    studentId: uuid('studentId')
      .notNull()
      .references(() => profile.id, { onDelete: 'cascade' }),
    status: examSlotRequestStatus('status').notNull().default('pending'),
    reviewedAt: timestamp('reviewedAt'),
    reviewedBy: uuid('reviewedBy').references(() => profile.id),
    examId: uuid('examId').references(() => exam.id),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  table => [
    index('examSlotRequest_studentId_idx').on(table.studentId),
    index('examSlotRequest_status_createdAt_idx').on(table.status, table.createdAt),
    foreignKey({
      name: 'examSlotRequest_slotId_trackId_fk',
      columns: [table.slotId, table.trackId],
      foreignColumns: [examSlot.id, examSlot.trackId],
    }).onDelete('cascade'),
    // Single-seat protection: at most one live claim on any one slot, regardless of student.
    uniqueIndex('examSlotRequest_one_pending_per_slot_uidx')
      .on(table.slotId)
      .where(sql`${table.status} = 'pending'`),
    // A student can't hold pending requests on two different slots of the same track at once —
    // has to let one resolve (approved, rejected, or its slot cancelled) before trying another.
    uniqueIndex('examSlotRequest_one_pending_per_student_track_uidx')
      .on(table.studentId, table.trackId)
      .where(sql`${table.status} = 'pending'`),
  ],
)

// A prospective student's self-submitted application — not yet a `user`/`profile` at the time it's
// filed. Deliberately holds its own identity fields (name/phone/email/etc.) rather than
// referencing `profile`: most registrants don't have an account yet, and a registration must be
// able to exist (and be reviewed) before one does. Approving one (apps/api/src/registrations/
// service.ts) provisions the real `user`/`member`/`profile` rows and records the result here via
// `convertedProfileId`.
export const registration = pgTable(
  'registration',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    status: registrationStatus('status').notNull().default('pending'),
    // The course the applicant is applying to.
    courseId: uuid('courseId')
      .notNull()
      .references(() => course.id),

    firstName: text('firstName').notNull(),
    lastName: text('lastName').notNull(),
    // Mandatory: a certification exam's children's bonus is worked out from it, so a student
    // admitted without one could never be graded (`profile.yearOfBirth`, copied from here, stays
    // nullable — staff profiles never file a registration).
    yearOfBirth: integer('yearOfBirth').notNull(),
    phone: text('phone').notNull(),
    email: text('email'),
    city: text('city'),
    // Same shape as `profile`'s own columns — see that table's doc comment for why these are
    // codes, and why `countryTimeZone` is server-derived rather than applicant-supplied.
    state: text('state'),
    country: text('country'),
    countryTimeZone: text('countryTimeZone'),

    learningGoal: text('learningGoal'),
    currentProficiency: proficiencyLevel('currentProficiency'),
    spokenLanguages: text('spokenLanguages').array().notNull().default([]),
    readLanguages: text('readLanguages').array().notNull().default([]),

    parentNames: text('parentNames').array().notNull().default([]),
    dressCodeAgreed: boolean('dressCodeAgreed').notNull().default(false),
    noMeatAgreed: boolean('noMeatAgreed').notNull().default(false),
    noAlcoholAgreed: boolean('noAlcoholAgreed').notNull().default(false),
    noSmokingAgreed: boolean('noSmokingAgreed').notNull().default(false),
    comments: text('comments'),

    reviewedAt: timestamp('reviewedAt'),
    reviewedBy: uuid('reviewedBy').references(() => profile.id),
    // Set only on approval — the profile provisioned for this applicant, so an approved
    // registration's outcome stays traceable instead of just becoming an unlinked 'approved' row.
    convertedProfileId: uuid('convertedProfileId').references(() => profile.id),

    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  table => [
    index('registration_status_createdAt_idx').on(table.status, table.createdAt),
    index('registration_phone_idx').on(table.phone),
  ],
)
