import { relations, sql } from 'drizzle-orm'
import {
  pgTable,
  pgEnum,
  pgSequence,
  text,
  integer,
  real,
  date,
  timestamp,
  uuid,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core'

export const trackOrderSeq = pgSequence('track_order_seq', { startWith: 1 })
export const chapterOrderSeq = pgSequence('chapter_order_seq', { startWith: 1 })

export const chapterStatus = pgEnum('chapterStatus', ['draft', 'published'])
export const script = pgEnum('script', ['te', 'sa', 'en'])
export const batchStatus = pgEnum('batchStatus', ['upcoming', 'active', 'completed'])
export const enrollmentRole = pgEnum('enrollmentRole', ['instructor', 'ta', 'student'])
export const enrollmentStatus = pgEnum('enrollmentStatus', ['active', 'inactive', 'completed'])
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

export const track = pgTable('track', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  order: integer('order').notNull().default(sql`nextval('track_order_seq')`),
})

export const chapter = pgTable(
  'chapter',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trackId: uuid('trackId')
      .notNull()
      .references(() => track.id),
    code: text('code').notNull().unique(),
    title: text('title').notNull(),
    status: chapterStatus('status').notNull().default('draft'),
    order: integer('order').notNull().default(sql`nextval('chapter_order_seq')`),
    script: script('script'),
    textUrl: text('textUrl'),
  },
  table => [index('chapter_trackId_idx').on(table.trackId)],
)

export const segment = pgTable(
  'segment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    chapterId: uuid('chapterId')
      .notNull()
      .references(() => chapter.id, { onDelete: 'cascade' }),
    start: integer('start').notNull(),
    end: integer('end').notNull(),
  },
  table => [index('segment_chapterId_idx').on(table.chapterId)],
)

export const audioAsset = pgTable(
  'audioAsset',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    chapterId: uuid('chapterId')
      .notNull()
      .references(() => chapter.id),
    label: text('label'),
    url: text('url').notNull(),
    duration: real('duration').notNull(),
  },
  table => [index('audioAsset_chapterId_idx').on(table.chapterId)],
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
  table => [primaryKey({ columns: [table.segmentId, table.audioAssetId] })],
)

export const batch = pgTable('batch', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: text('teamId').notNull().unique(),
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
      .references(() => batch.id),
    phone: text('phone'),
    city: text('city'),
    role: enrollmentRole('role').notNull(),
    status: enrollmentStatus('status').notNull().default('active'),
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
    id: uuid('id').primaryKey().defaultRandom(),
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
    id: uuid('id').primaryKey().defaultRandom(),
    batchId: uuid('batchId')
      .notNull()
      .references(() => batch.id),
    studentId: text('studentId').notNull(),
    scheduledAt: timestamp('scheduledAt').notNull(),
    status: examStatus('status').notNull().default('scheduled'),
  },
  table => [
    index('exam_batchId_idx').on(table.batchId),
    index('exam_studentId_idx').on(table.studentId),
  ],
)

export const examResult = pgTable(
  'examResult',
  {
    examId: uuid('examId')
      .notNull()
      .references(() => exam.id),
    chapterId: uuid('chapterId')
      .notNull()
      .references(() => chapter.id),
    evaluationId: uuid('evaluationId')
      .notNull()
      .references(() => evaluation.id),
  },
  table => [primaryKey({ columns: [table.examId, table.chapterId] })],
)

export const trackRelations = relations(track, ({ many }) => ({
  chapters: many(chapter),
  batches: many(batch),
}))

export const chapterRelations = relations(chapter, ({ one, many }) => ({
  track: one(track, { fields: [chapter.trackId], references: [track.id] }),
  segments: many(segment),
  audioAssets: many(audioAsset),
  evaluations: many(evaluation),
}))

export const segmentRelations = relations(segment, ({ one, many }) => ({
  chapter: one(chapter, { fields: [segment.chapterId], references: [chapter.id] }),
  audioMappings: many(audioMapping),
}))

export const audioAssetRelations = relations(audioAsset, ({ one, many }) => ({
  chapter: one(chapter, { fields: [audioAsset.chapterId], references: [chapter.id] }),
  audioMappings: many(audioMapping),
}))

export const audioMappingRelations = relations(audioMapping, ({ one }) => ({
  segment: one(segment, { fields: [audioMapping.segmentId], references: [segment.id] }),
  audioAsset: one(audioAsset, {
    fields: [audioMapping.audioAssetId],
    references: [audioAsset.id],
  }),
}))

export const batchRelations = relations(batch, ({ one, many }) => ({
  track: one(track, { fields: [batch.trackId], references: [track.id] }),
  enrollments: many(enrollment),
  exams: many(exam),
}))

export const enrollmentRelations = relations(enrollment, ({ one }) => ({
  batch: one(batch, { fields: [enrollment.batchId], references: [batch.id] }),
}))

export const evaluationRelations = relations(evaluation, ({ one }) => ({
  chapter: one(chapter, { fields: [evaluation.chapterId], references: [chapter.id] }),
}))

export const examRelations = relations(exam, ({ one, many }) => ({
  batch: one(batch, { fields: [exam.batchId], references: [batch.id] }),
  results: many(examResult),
}))

export const examResultRelations = relations(examResult, ({ one }) => ({
  exam: one(exam, { fields: [examResult.examId], references: [exam.id] }),
  chapter: one(chapter, { fields: [examResult.chapterId], references: [chapter.id] }),
  evaluation: one(evaluation, { fields: [examResult.evaluationId], references: [evaluation.id] }),
}))
