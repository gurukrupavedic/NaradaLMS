import {
  pgTable,
  pgEnum,
  text,
  integer,
  timestamp,
  time,
  uuid,
  index,
  primaryKey,
  uniqueIndex,
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
    joinedAt: timestamp('joinedAt').defaultNow(),
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
    studentId: uuid('studentId')
      .notNull()
      .references(() => profile.id, { onDelete: 'cascade' }),
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
