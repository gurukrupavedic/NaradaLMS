import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  real,
  unique,
  uniqueIndex,
  check,
  foreignKey,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";



// User storage table with multi-role support and social login
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),

  // Authentication
  passwordHash: varchar("password_hash"), // Null for social-only users
  provider: varchar("provider").notNull().default("local"), // 'local' | 'google' (DB CHECK)
  providerId: varchar("provider_id"), // Provider user ID

  // Authorization
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),

  // Audit / invitations (self-FKs in table callback)
  invitedBy: varchar("invited_by"),
  invitedAt: timestamp("invited_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedBy: varchar("approved_by"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.invitedBy],
    foreignColumns: [table.id],
    name: "users_invited_by_fkey",
  }).onDelete("set null"),
  foreignKey({
    columns: [table.approvedBy],
    foreignColumns: [table.id],
    name: "users_approved_by_fkey",
  }).onDelete("set null"),
  check("users_provider_check", sql`provider IN ('local', 'google')`),
]);

// Organizations — tenant identity (multi-tenancy expand phase)
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    status: varchar("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "organizations_status_check",
      sql`${table.status} IN ('active', 'inactive')`
    ),
  ]
);

// User–organization membership (per-org roles and status)
export const userOrganizations = pgTable(
  "user_organizations",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    roles: text("roles")
      .array()
      .notNull()
      .default(sql`ARRAY['student']::text[]`),
    status: varchar("status").notNull().default("pending"),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: varchar("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("user_organizations_user_org_uniq").on(table.userId, table.orgId),
    check(
      "user_organizations_status_check",
      sql`${table.status} IN ('pending', 'active', 'inactive', 'rejected')`
    ),
    check(
      "user_organizations_roles_subset_check",
      sql`${table.roles} <@ ARRAY['student','instructor','admin']::text[]`
    ),
    index("idx_user_org_user_id").on(table.userId),
    index("idx_user_org_org_id").on(table.orgId),
    index("idx_user_org_status").on(table.status),
    index("idx_user_org_org_status").on(table.orgId, table.status),
  ]
);

// Learning tracks - Vedic curriculum structure
export const tracks = pgTable("tracks", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, {
    onDelete: "restrict",
  }),
  title: text("title").notNull(), // Unique per organization in Pass A
  description: text("description").notNull(), // Made mandatory
  sortOrder: integer("sort_order").notNull(), // Sequential number starting from 1, 2, 3...
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_tracks_org").on(table.orgId),
  unique("tracks_org_title_uniq").on(table.orgId, table.title),
]);

// Chapters - Wiki-style content with draft/published workflow
export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, {
    onDelete: "restrict",
  }),
  trackId: integer("track_id").notNull().references(() => tracks.id, { onDelete: "cascade" }),
  title: text("title").notNull(), // Single source of truth per Q9
  sortOrder: integer("sort_order").notNull(),
  status: varchar("status").default("draft").notNull(), // 'draft', 'published' with protection per Q13
  content: jsonb("content").$type<{
    te?: string; // Telugu
    hi?: string; // Devanagari/Hindi  
    en?: string; // English/IAST
  }>().default({}).notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }), // Track when content was published
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  lastEditedBy: varchar("last_edited_by").references(() => users.id),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_chapters_org").on(table.orgId),
  index("idx_chapters_track").on(table.trackId),
  unique("chapters_track_title_uniq").on(table.trackId, table.title),
  check("chapters_status_check", sql`status IN ('draft', 'published')`),
]);

// Audio files for chapters
export const audioFiles = pgTable("audio_files", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, {
    onDelete: "restrict",
  }),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  displayName: text("display_name").notNull(),
  reciter: text("reciter"),
  duration: real("duration"), // in seconds
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type"),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_audio_files_org").on(table.orgId),
  index("idx_audio_files_chapter").on(table.chapterId),
]);

// Text segments - Script-specific approach for clean architecture
export const textSegments = pgTable("text_segments", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, {
    onDelete: "restrict",
  }),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  script: varchar("script", { length: 2 }).notNull(), // 'te', 'hi', 'en'
  startPosition: integer("start_position").notNull(),
  endPosition: integer("end_position").notNull(),
  order: integer("order").notNull().default(0),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_text_segments_org").on(table.orgId),
  unique("text_segments_chapter_script_order_uniq").on(
    table.chapterId,
    table.script,
    table.order
  ),
  check(
    "text_segments_start_lte_end_check",
    sql`start_position <= end_position`
  ),
]);

// Media segments - Audio file timestamp segments (integer milliseconds; Bundle E)
export const mediaSegments = pgTable("media_segments", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, {
    onDelete: "restrict",
  }),
  audioFileId: integer("audio_file_id").notNull().references(() => audioFiles.id, { onDelete: "cascade" }),
  startMs: integer("start_ms").notNull(), // in milliseconds
  endMs: integer("end_ms").notNull(), // in milliseconds
  segmentName: text("segment_name"), // Optional human-readable name
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_media_segments_org").on(table.orgId),
  check(
    "media_segments_start_ms_nonneg_check",
    sql`${table.startMs} >= 0`
  ),
  check(
    "media_segments_end_ms_nonneg_check",
    sql`${table.endMs} >= 0`
  ),
  check(
    "media_segments_start_lt_end_check",
    sql`${table.startMs} < ${table.endMs}`
  ),
]);

// Segment mapping - Maps media segments to text segments
export const segmentMappings = pgTable("segment_mappings", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, {
    onDelete: "restrict",
  }),
  mediaSegmentId: integer("media_segment_id").notNull().references(() => mediaSegments.id, { onDelete: "cascade" }),
  textSegmentId: integer("text_segment_id").notNull().references(() => textSegments.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_segment_mappings_org").on(table.orgId),
  unique("segment_mappings_media_text_uniq").on(
    table.mediaSegmentId,
    table.textSegmentId
  ),
]);

// Batches - Flexible cohorts (track and instructor optional; assignable later)
export const batches = pgTable("batches", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, {
    onDelete: "restrict",
  }),
  batchCode: text("batch_code").notNull(),
  batchName: text("batch_name").notNull(),
  trackId: integer("track_id").references(() => tracks.id, { onDelete: "set null" }),
  primaryInstructorId: varchar("primary_instructor_id").references(() => users.id),
  cohortType: varchar("cohort_type", { length: 20 }), // 'bramhachari', 'grihasta' - optional
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
}, (table) => [
  index("idx_batches_org").on(table.orgId),
  unique("batches_org_batch_code_uniq").on(table.orgId, table.batchCode),
]);

// Enrollments - Student enrollment in batches
// BUSINESS RULE: A student can only be enrolled in ONE batch at a time (one-to-many relationship)
export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, {
    onDelete: "restrict",
  }),
  batchId: integer("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => users.id),
  status: varchar("status").default("active").notNull(), // 'active', 'dropped', 'completed'
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).defaultNow(),
  enrolledBy: varchar("enrolled_by").notNull().references(() => users.id),
  droppedAt: timestamp("dropped_at", { withTimezone: true }),
  droppedReason: text("dropped_reason"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  // Partial unique index: only one active enrollment per student within an org.
  uniqueIndex("unique_active_enrollment_idx")
    .on(table.orgId, table.studentId)
    .where(sql`status = 'active'`),
  index("idx_enrollments_org").on(table.orgId),
  index("idx_enrollments_batch").on(table.batchId),
  check(
    "enrollments_status_check",
    sql`status IN ('active', 'dropped', 'completed')`
  ),
]);

// Batch Co-Instructors - Additional instructors/TAs for a batch
export const batchCoInstructors = pgTable("batch_co_instructors", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  role: varchar("role").default("co_instructor").notNull(), // 'co_instructor', 'ta'
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow(),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id),
}, (table) => [
  index("idx_co_instructors_batch").on(table.batchId),
  index("idx_co_instructors_instructor").on(table.instructorId),
  unique("batch_co_instructors_batch_instructor_uniq").on(
    table.batchId,
    table.instructorId
  ),
]);

// Student progress tracking
export const studentProgress = pgTable("student_progress", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, {
    onDelete: "restrict",
  }),
  studentId: varchar("student_id").notNull().references(() => users.id),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  batchId: integer("batch_id").references(() => batches.id),
  // Allowed set matches student_progress_proficiency_level_check and VALID_PROFICIENCY_LEVELS: 0–4 skill bands, 8 absent, 9 not started
  proficiencyLevel: integer("proficiency_level").default(0).notNull(),
  lastAccessed: timestamp("last_accessed", { withTimezone: true }),
  lastEvaluatedAt: timestamp("last_evaluated_at", { withTimezone: true }),
  evaluatedBy: varchar("evaluated_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_progress_org").on(table.orgId),
  index("idx_progress_student").on(table.studentId),
  index("idx_progress_chapter").on(table.chapterId),
  index("idx_progress_batch").on(table.batchId),
  unique("student_progress_student_chapter_unique").on(
    table.studentId,
    table.chapterId
  ),
  check(
    "student_progress_proficiency_level_check",
    sql`proficiency_level IN (0, 1, 2, 3, 4, 8, 9)`
  ),
]);

// Proficiency Evaluation Log - Audit trail for proficiency changes
export const proficiencyEvaluationLog = pgTable("proficiency_evaluation_log", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, {
    onDelete: "restrict",
  }),
  studentId: varchar("student_id").notNull().references(() => users.id),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  batchId: integer("batch_id").references(() => batches.id), // Current batch at time of evaluation
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  oldProficiencyLevel: integer("old_proficiency_level"),
  newProficiencyLevel: integer("new_proficiency_level").notNull(),
  notes: text("notes"),
  evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_proficiency_log_org").on(table.orgId),
  index("idx_proficiency_log_student").on(table.studentId),
  index("idx_proficiency_log_chapter").on(table.chapterId),
  index("idx_proficiency_log_batch").on(table.batchId),
  check(
    "proficiency_eval_log_new_level_check",
    sql`new_proficiency_level IN (0, 1, 2, 3, 4, 8, 9)`
  ),
  check(
    "proficiency_eval_log_old_level_check",
    sql`(old_proficiency_level IS NULL OR old_proficiency_level IN (0, 1, 2, 3, 4, 8, 9))`
  ),
]);

// Audit logs - Track all sensitive operations
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id, {
    onDelete: "restrict",
  }),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // 'CREATE_CHAPTER', 'PUBLISH_CHAPTER', 'ENROLL_STUDENT', etc.
  resourceType: text("resource_type").notNull(), // 'chapter', 'batch', 'enrollment', etc.
  resourceId: text("resource_id").notNull(),
  changes: jsonb("changes"), // { before: {...}, after: {...} }
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
  requestId: text("request_id"), // for tracing
}, (table) => [
  index("idx_audit_logs_org_timestamp_desc").on(table.orgId, table.timestamp.desc()),
  index("idx_audit_logs_timestamp_desc").on(table.timestamp.desc()),
  index("idx_audit_logs_user_timestamp_desc").on(table.userId, table.timestamp.desc()),
  index("idx_audit_logs_resource_type_timestamp_desc").on(table.resourceType, table.timestamp.desc()),
]);

// System settings — global key-value store only in pre-tenancy phase (no org_id); tenant keys belong in future org_settings
export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(userOrganizations, { relationName: "membershipUser" }),
  membershipsApprovedByUser: many(userOrganizations, {
    relationName: "membershipApprovedByUser",
  }),
  createdTracks: many(tracks),
  createdChapters: many(chapters),
  uploadedAudioFiles: many(audioFiles),
  createdSegments: many(textSegments),
  createdMediaSegments: many(mediaSegments),
  createdSegmentMappings: many(segmentMappings),
  studentProgress: many(studentProgress, { relationName: "studentProgress" }),
  evaluatedProgress: many(studentProgress, { relationName: "evaluatedProgress" }),
  createdBatches: many(batches),
  primaryInstructorBatches: many(batches, { relationName: "primaryInstructor" }),
  coInstructorAssignments: many(batchCoInstructors),
  enrollments: many(enrollments),
  auditLogs: many(auditLogs),
  proficiencyEvalLogsAsStudent: many(proficiencyEvaluationLog, {
    relationName: "evalLogStudent",
  }),
  proficiencyEvalLogsAsInstructor: many(proficiencyEvaluationLog, {
    relationName: "evalLogInstructor",
  }),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  userOrganizations: many(userOrganizations),
  tracks: many(tracks),
  chapters: many(chapters),
  audioFiles: many(audioFiles),
  textSegments: many(textSegments),
  mediaSegments: many(mediaSegments),
  segmentMappings: many(segmentMappings),
  studentProgress: many(studentProgress),
  proficiencyEvaluationLogs: many(proficiencyEvaluationLog),
  batches: many(batches),
  enrollments: many(enrollments),
  auditLogs: many(auditLogs),
}));

export const userOrganizationsRelations = relations(
  userOrganizations,
  ({ one }) => ({
    user: one(users, {
      fields: [userOrganizations.userId],
      references: [users.id],
      relationName: "membershipUser",
    }),
    organization: one(organizations, {
      fields: [userOrganizations.orgId],
      references: [organizations.id],
    }),
    approvedByUser: one(users, {
      fields: [userOrganizations.approvedBy],
      references: [users.id],
      relationName: "membershipApprovedByUser",
    }),
  })
);

export const tracksRelations = relations(tracks, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [tracks.orgId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [tracks.createdBy],
    references: [users.id],
  }),
  chapters: many(chapters),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [chapters.orgId],
    references: [organizations.id],
  }),
  track: one(tracks, {
    fields: [chapters.trackId],
    references: [tracks.id],
  }),
  createdBy: one(users, {
    fields: [chapters.createdBy],
    references: [users.id],
  }),
  audioFiles: many(audioFiles),
  textSegments: many(textSegments),
  studentProgress: many(studentProgress),
  proficiencyEvaluationLogs: many(proficiencyEvaluationLog),
}));

export const audioFilesRelations = relations(audioFiles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [audioFiles.orgId],
    references: [organizations.id],
  }),
  chapter: one(chapters, {
    fields: [audioFiles.chapterId],
    references: [chapters.id],
  }),
  uploadedBy: one(users, {
    fields: [audioFiles.uploadedBy],
    references: [users.id],
  }),
  mediaSegments: many(mediaSegments),
}));

export const textSegmentsRelations = relations(textSegments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [textSegments.orgId],
    references: [organizations.id],
  }),
  chapter: one(chapters, {
    fields: [textSegments.chapterId],
    references: [chapters.id],
  }),
  createdBy: one(users, {
    fields: [textSegments.createdBy],
    references: [users.id],
  }),
  segmentMappings: many(segmentMappings),
}));

export const mediaSegmentsRelations = relations(mediaSegments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [mediaSegments.orgId],
    references: [organizations.id],
  }),
  audioFile: one(audioFiles, {
    fields: [mediaSegments.audioFileId],
    references: [audioFiles.id],
  }),
  createdBy: one(users, {
    fields: [mediaSegments.createdBy],
    references: [users.id],
  }),
  segmentMappings: many(segmentMappings),
}));

export const segmentMappingsRelations = relations(segmentMappings, ({ one }) => ({
  organization: one(organizations, {
    fields: [segmentMappings.orgId],
    references: [organizations.id],
  }),
  mediaSegment: one(mediaSegments, {
    fields: [segmentMappings.mediaSegmentId],
    references: [mediaSegments.id],
  }),
  textSegment: one(textSegments, {
    fields: [segmentMappings.textSegmentId],
    references: [textSegments.id],
  }),
  createdBy: one(users, {
    fields: [segmentMappings.createdBy],
    references: [users.id],
  }),
}));

export const studentProgressRelations = relations(studentProgress, ({ one }) => ({
  organization: one(organizations, {
    fields: [studentProgress.orgId],
    references: [organizations.id],
  }),
  student: one(users, {
    fields: [studentProgress.studentId],
    references: [users.id],
    relationName: "studentProgress",
  }),
  chapter: one(chapters, {
    fields: [studentProgress.chapterId],
    references: [chapters.id],
  }),
  batch: one(batches, {
    fields: [studentProgress.batchId],
    references: [batches.id],
  }),
  evaluatedBy: one(users, {
    fields: [studentProgress.evaluatedBy],
    references: [users.id],
    relationName: "evaluatedProgress",
  }),
}));

export const proficiencyEvaluationLogRelations = relations(
  proficiencyEvaluationLog,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [proficiencyEvaluationLog.orgId],
      references: [organizations.id],
    }),
    student: one(users, {
      fields: [proficiencyEvaluationLog.studentId],
      references: [users.id],
      relationName: "evalLogStudent",
    }),
    instructor: one(users, {
      fields: [proficiencyEvaluationLog.instructorId],
      references: [users.id],
      relationName: "evalLogInstructor",
    }),
    chapter: one(chapters, {
      fields: [proficiencyEvaluationLog.chapterId],
      references: [chapters.id],
    }),
    batch: one(batches, {
      fields: [proficiencyEvaluationLog.batchId],
      references: [batches.id],
    }),
  })
);

export const batchesRelations = relations(batches, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [batches.orgId],
    references: [organizations.id],
  }),
  track: one(tracks, {
    fields: [batches.trackId],
    references: [tracks.id],
  }),
  primaryInstructor: one(users, {
    fields: [batches.primaryInstructorId],
    references: [users.id],
    relationName: "primaryInstructor",
  }),
  createdBy: one(users, {
    fields: [batches.createdBy],
    references: [users.id],
  }),
  enrollments: many(enrollments),
  coInstructors: many(batchCoInstructors),
  proficiencyEvaluationLogs: many(proficiencyEvaluationLog),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  organization: one(organizations, {
    fields: [enrollments.orgId],
    references: [organizations.id],
  }),
  batch: one(batches, {
    fields: [enrollments.batchId],
    references: [batches.id],
  }),
  student: one(users, {
    fields: [enrollments.studentId],
    references: [users.id],
  }),
  enrolledBy: one(users, {
    fields: [enrollments.enrolledBy],
    references: [users.id],
  }),
}));

export const batchCoInstructorsRelations = relations(batchCoInstructors, ({ one }) => ({
  batch: one(batches, {
    fields: [batchCoInstructors.batchId],
    references: [batches.id],
  }),
  instructor: one(users, {
    fields: [batchCoInstructors.instructorId],
    references: [users.id],
  }),
  assignedBy: one(users, {
    fields: [batchCoInstructors.assignedBy],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLogs.orgId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  updatedBy: one(users, {
    fields: [systemSettings.updatedBy],
    references: [users.id],
  }),
}));

// Insert and Select schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertOrganizationSchema = createInsertSchema(organizations);
export const selectOrganizationSchema = createSelectSchema(organizations);

export const insertUserOrganizationSchema = createInsertSchema(userOrganizations);
export const selectUserOrganizationSchema = createSelectSchema(userOrganizations);

export const insertTrackSchema = createInsertSchema(tracks).omit({ id: true, orgId: true, createdAt: true, updatedAt: true, createdBy: true, sortOrder: true });
export const selectTrackSchema = createSelectSchema(tracks);

export const insertChapterSchema = createInsertSchema(chapters).omit({ id: true, orgId: true, createdAt: true, updatedAt: true, sortOrder: true, createdBy: true, lastEditedBy: true, publishedAt: true, deletedAt: true });
export const selectChapterSchema = createSelectSchema(chapters);

export const insertAudioFileSchema = createInsertSchema(audioFiles).omit({ id: true, createdAt: true });
export const selectAudioFileSchema = createSelectSchema(audioFiles);

export const insertTextSegmentSchema = createInsertSchema(textSegments).omit({ id: true, createdAt: true, order: true });
export const selectTextSegmentSchema = createSelectSchema(textSegments);

export const insertMediaSegmentSchema = createInsertSchema(mediaSegments).omit({ id: true, createdAt: true });
export const selectMediaSegmentSchema = createSelectSchema(mediaSegments);

export const insertSegmentMappingSchema = createInsertSchema(segmentMappings).omit({ id: true, createdAt: true });
export const selectSegmentMappingSchema = createSelectSchema(segmentMappings);

export const insertStudentProgressSchema = createInsertSchema(studentProgress).omit({ id: true, createdAt: true, updatedAt: true });
export const selectStudentProgressSchema = createSelectSchema(studentProgress);

export const insertBatchSchema = createInsertSchema(batches).omit({ id: true, orgId: true, createdAt: true, updatedAt: true });
export const selectBatchSchema = createSelectSchema(batches);

export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({ id: true, orgId: true, enrolledAt: true, updatedAt: true });
export const selectEnrollmentSchema = createSelectSchema(enrollments);

export const insertBatchCoInstructorSchema = createInsertSchema(batchCoInstructors).omit({ id: true, assignedAt: true });
export const selectBatchCoInstructorSchema = createSelectSchema(batchCoInstructors);

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true }) as z.ZodType<Record<string, unknown>>;
export const selectAuditLogSchema = createSelectSchema(auditLogs);

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({ updatedAt: true });
export const selectSystemSettingSchema = createSelectSchema(systemSettings);

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = z.infer<typeof selectOrganizationSchema>;

export type InsertUserOrganization = z.infer<typeof insertUserOrganizationSchema>;
export type UserOrganization = z.infer<typeof selectUserOrganizationSchema>;

export type InsertTrack = z.infer<typeof insertTrackSchema>;
export type Track = z.infer<typeof selectTrackSchema>;

export type InsertChapter = z.infer<typeof insertChapterSchema>;
export type Chapter = z.infer<typeof selectChapterSchema>;

export type InsertAudioFile = z.infer<typeof insertAudioFileSchema>;
export type AudioFile = z.infer<typeof selectAudioFileSchema>;

export type InsertTextSegment = z.infer<typeof insertTextSegmentSchema>;
export type TextSegment = z.infer<typeof selectTextSegmentSchema>;

export type InsertMediaSegment = z.infer<typeof insertMediaSegmentSchema>;
export type MediaSegment = z.infer<typeof selectMediaSegmentSchema>;

export type InsertSegmentMapping = z.infer<typeof insertSegmentMappingSchema>;
export type SegmentMapping = z.infer<typeof selectSegmentMappingSchema>;

export type InsertStudentProgress = z.infer<typeof insertStudentProgressSchema>;
export type StudentProgress = z.infer<typeof selectStudentProgressSchema>;

export type InsertBatch = z.infer<typeof insertBatchSchema>;
export type Batch = z.infer<typeof selectBatchSchema>;

export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Enrollment = z.infer<typeof selectEnrollmentSchema>;

export type InsertBatchCoInstructor = z.infer<typeof insertBatchCoInstructorSchema>;
export type BatchCoInstructor = z.infer<typeof selectBatchCoInstructorSchema>;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = z.infer<typeof selectAuditLogSchema>;

export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type SystemSetting = z.infer<typeof selectSystemSettingSchema>;
