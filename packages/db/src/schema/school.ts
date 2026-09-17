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
  check,
} from 'drizzle-orm/pg-core'
import { uuidv7 } from '../ids'

// Declared before `profile` (below) since `profile.currentProficiency` references it — a pgEnum
// value must exist before a pgTable call closes over it.
export const proficiencyLevel = pgEnum('proficiencyLevel', [
  'absent',
  'notStarted',
  'practicing',
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
export const registrationStatus = pgEnum('registrationStatus', ['pending', 'approved', 'rejected'])

export const track = pgTable(
  'track',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    name: text('name').notNull(),
    order: integer('order').notNull(),
  },
  table => [uniqueIndex('track_order_uidx').on(table.order)],
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

export const batch = pgTable('batch', {
  id: uuid('id').primaryKey().$defaultFn(uuidv7),
  trackId: uuid('trackId')
    .notNull()
    .references(() => track.id),
  code: text('code').notNull().unique(),
  status: batchStatus('status').notNull().default('upcoming'),
  startDate: timestamp('startDate'),
  meetingUrl: text('meetingUrl'),
  // A student can request to join (apps/api/src/enrollmentRequests/service.ts::request) only
  // while the batch is open: `enrollmentOpensAt` is non-null and in the past, AND
  // (`enrollmentClosesAt` is null OR still in the future) — the request still needs an
  // admin/instructor to approve it (`enrollmentRequest`) before `enrollment/service.ts::enroll`
  // actually seats them. `enrollmentOpensAt: null` (the default) means never open, not "always
  // open" — an admin opts a batch in explicitly rather than every batch silently becoming joinable
  // the moment it's 'upcoming'. `enrollmentClosesAt: null` means open-ended (no scheduled close),
  // not closed — that's what lets an admin "just open it" (`POST /batches/:id/enrollment/open`)
  // without having to pick an end date. No batch has a seat cap — every open batch takes any number
  // of students.
  enrollmentOpensAt: timestamp('enrollmentOpensAt'),
  enrollmentClosesAt: timestamp('enrollmentClosesAt'),
})

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
    role: enrollmentRole('role').notNull(),
    status: enrollmentStatus('status').notNull().default('active'),
    joinedAt: timestamp('joinedAt').defaultNow(),
    leftDate: timestamp('leftDate'),
  },
  table => [
    primaryKey({ columns: [table.profileId, table.batchId] }),
    index('enrollment_batchId_idx').on(table.batchId),
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

// A track's certification result, per student — the outcome the whole track builds toward, not a
// mark on any one taught chapter. Previously modeled (in the imported data) as a fake `chapter`
// row ("TRACK N CERTIFICATION EXAM STATUS") with an ordinary `evaluation` against it; that made a
// track's certification indistinguishable from its actual syllabus in every chapter list. This
// table gives it a real, decoupled home instead — same append-only-history shape as `evaluation`
// (multiple rows over time; latest wins), but keyed on the track rather than a chapter, since a
// certification was never really about one specific chapter to begin with.
export const trackCertification = pgTable(
  'trackCertification',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    trackId: uuid('trackId')
      .notNull()
      .references(() => track.id, { onDelete: 'cascade' }),
    studentId: uuid('studentId')
      .notNull()
      .references(() => profile.id, { onDelete: 'cascade' }),
    level: proficiencyLevel('level').notNull(),
    notes: text('notes'),
    evaluatorId: uuid('evaluatorId')
      .notNull()
      .references(() => profile.id, { onDelete: 'restrict' }),
    evaluatedAt: timestamp('evaluatedAt').defaultNow(),
  },
  table => [index('trackCertification_studentId_trackId_idx').on(table.studentId, table.trackId)],
)

export const exam = pgTable(
  'exam',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    chapterId: uuid('chapterId')
      .notNull()
      .references(() => chapter.id),
    studentId: uuid('studentId')
      .notNull()
      .references(() => profile.id, { onDelete: 'cascade' }),
    scheduledAt: timestamp('scheduledAt').notNull(),
    status: examStatus('status').notNull().default('scheduled'),
    evaluationId: uuid('evaluationId').references(() => evaluation.id),
    performedAt: timestamp('performedAt'),
    batchId: uuid('batchId').references(() => batch.id),
  },
  table => [
    index('exam_chapterId_idx').on(table.chapterId),
    index('exam_studentId_idx').on(table.studentId),
    index('exam_batchId_studentId_idx').on(table.batchId, table.studentId),
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

    firstName: text('firstName').notNull(),
    lastName: text('lastName').notNull(),
    yearOfBirth: integer('yearOfBirth'),
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
