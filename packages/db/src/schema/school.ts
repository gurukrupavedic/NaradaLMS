import { sql } from 'drizzle-orm'
import {
  pgTable,
  pgEnum,
  text,
  integer,
  real,
  date,
  timestamp,
  uuid,
  index,
  primaryKey,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core'
import { uuidv7 } from '../ids'

export const chapterStatus = pgEnum('chapterStatus', ['draft', 'published'])
export const script = pgEnum('script', ['te', 'sa', 'en'])
export const batchStatus = pgEnum('batchStatus', ['upcoming', 'active', 'completed'])
export const enrollmentRole = pgEnum('enrollmentRole', ['instructor', 'ta', 'student'])
export const stagedUploadPurpose = pgEnum('stagedUploadPurpose', ['chapterText', 'audio'])
export const stagedUploadStatus = pgEnum('stagedUploadStatus', ['pending', 'completed', 'expired'])
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
    textObjectKey: text('textObjectKey'),
  },
  table => [
    index('chapter_trackId_idx').on(table.trackId),
    uniqueIndex('chapter_trackId_code_uidx').on(table.trackId, table.code),
    uniqueIndex('chapter_trackId_order_uidx').on(table.trackId, table.order),
  ],
)

export const segment = pgTable(
  'segment',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    chapterId: uuid('chapterId')
      .notNull()
      .references(() => chapter.id, { onDelete: 'cascade' }),
    start: integer('start').notNull(),
    end: integer('end').notNull(),
  },
  table => [
    index('segment_chapterId_idx').on(table.chapterId),
    check('segment_bounds_valid', sql`${table.start} < ${table.end}`),
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
    objectKey: text('objectKey').notNull(),
    duration: real('duration').notNull(),
  },
  table => [
    index('audioAsset_chapterId_idx').on(table.chapterId),
    uniqueIndex('audioAsset_chapterId_objectKey_idx').on(table.chapterId, table.objectKey),
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

export const stagedUpload = pgTable(
  'stagedUpload',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    schoolId: text('schoolId').notNull(),
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
  code: text('code').notNull().unique(),
  trackId: uuid('trackId')
    .notNull()
    .references(() => track.id),
  startDate: date('startDate'),
  status: batchStatus('status').notNull().default('upcoming'),
  scheduledAt: timestamp('scheduledAt'),
  meetingUrl: text('meetingUrl'),
})

export const enrollment = pgTable(
  'enrollment',
  {
    userId: text('userId').notNull(),
    batchId: uuid('batchId')
      .notNull()
      .references(() => batch.id, { onDelete: 'cascade' }),
    phone: text('phone'),
    city: text('city'),
    role: enrollmentRole('role').notNull(),
    joinedAt: timestamp('joinedAt').defaultNow(),
  },
  table => [
    primaryKey({ columns: [table.userId, table.batchId] }),
    index('enrollment_batchId_idx').on(table.batchId),
  ],
)

export const evaluation = pgTable(
  'evaluation',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    studentId: text('studentId').notNull(),
    chapterId: uuid('chapterId')
      .notNull()
      .references(() => chapter.id),
    level: proficiencyLevel('level').notNull(),
    notes: text('notes'),
    evaluatorId: text('evaluatorId').notNull(),
    evaluatedAt: timestamp('evaluatedAt').defaultNow(),
  },
  table => [index('evaluation_studentId_chapterId_idx').on(table.studentId, table.chapterId)],
)

export const exam = pgTable(
  'exam',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    chapterId: uuid('chapterId')
      .notNull()
      .references(() => chapter.id),
    studentId: text('studentId').notNull(),
    scheduledAt: timestamp('scheduledAt').notNull(),
    status: examStatus('status').notNull().default('scheduled'),
    evaluationId: uuid('evaluationId').references(() => evaluation.id),
    performedAt: timestamp('performedAt'),
  },
  table => [
    index('exam_chapterId_idx').on(table.chapterId),
    index('exam_studentId_idx').on(table.studentId),
  ],
)
