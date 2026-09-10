import { sql } from 'drizzle-orm'
import {
  pgTable,
  pgEnum,
  text,
  integer,
  real,
  timestamp,
  time,
  uuid,
  index,
  primaryKey,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core'
import { uuidv7 } from '../ids'

export const profile = pgTable(
  'profile',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    userId: text('userId').notNull(),
    name: text('name').notNull(),
    phone: text('phone'),
    city: text('city'),
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
export const proficiencyLevel = pgEnum('proficiencyLevel', [
  'absent',
  'notStarted',
  'practicing',
  'level1',
  'level2',
  'level3',
  'level4',
])
export const examStatus = pgEnum('examStatus', [
  'scheduled',
  'inProgress',
  'completed',
  'cancelled',
])

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
