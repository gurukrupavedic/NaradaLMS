import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  real,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (used by express-session + connect-pg-simple)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with multi-role support and social login
export const users: any = pgTable("users", {
  id: varchar("id").primaryKey().notNull().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),

  // Authentication
  passwordHash: varchar("password_hash"), // Null for social-only users
  provider: varchar("provider").notNull().default("local"), // 'local' | 'google' | 'facebook'
  providerId: varchar("provider_id"), // Provider user ID

  // Authorization
  roles: text("roles").array().notNull().default(sql`ARRAY[]::text[]`),
  status: varchar("status").notNull().default("pending_approval"), // 'pending_approval' | 'active' | 'inactive'

  // Audit / invitations
  invitedBy: varchar("invited_by").references(() => users.id),
  invitedAt: timestamp("invited_at"),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Learning tracks - Vedic curriculum structure
export const tracks = pgTable("tracks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().unique(), // Unique track titles as per requirements
  description: text("description").notNull(), // Made mandatory
  order: integer("order").notNull(), // Sequential number starting from 1, 2, 3...
  createdBy: varchar("created_by").notNull().references(() => users.id).default("system"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chapters - Wiki-style content with draft/published workflow
export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  trackId: integer("track_id").notNull().references(() => tracks.id, { onDelete: "cascade" }),
  title: text("title").notNull(), // Single source of truth per Q9
  order: integer("order").notNull(),
  status: varchar("status").default("draft").notNull(), // 'draft', 'published' with protection per Q13
  content: jsonb("content").$type<{
    te?: string; // Telugu
    hi?: string; // Devanagari/Hindi  
    en?: string; // English/IAST
  }>().default({}).notNull(),
  publishedAt: timestamp("published_at"), // Track when content was published
  lastEditedBy: varchar("last_edited_by").references(() => users.id),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audio files for chapters
export const audioFiles = pgTable("audio_files", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  displayName: text("display_name").notNull(),
  reciter: text("reciter"),
  duration: real("duration"), // in seconds
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type"),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Text segments - Script-specific approach for clean architecture
export const textSegments = pgTable("text_segments", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  script: varchar("script", { length: 2 }).notNull(), // 'te', 'hi', 'en'
  startPosition: integer("start_position").notNull(),
  endPosition: integer("end_position").notNull(),
  order: integer("order").notNull().default(0),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Media segments - Audio file timestamp segments
export const mediaSegments = pgTable("media_segments", {
  id: serial("id").primaryKey(),
  audioFileId: integer("audio_file_id").notNull().references(() => audioFiles.id, { onDelete: "cascade" }),
  startTimestamp: real("start_timestamp").notNull(), // in seconds
  endTimestamp: real("end_timestamp").notNull(), // in seconds
  segmentName: text("segment_name"), // Optional human-readable name
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Segment mapping - Maps media segments to text segments
export const segmentMappings = pgTable("segment_mappings", {
  id: serial("id").primaryKey(),
  mediaSegmentId: integer("media_segment_id").notNull().references(() => mediaSegments.id, { onDelete: "cascade" }),
  textSegmentId: integer("text_segment_id").notNull().references(() => textSegments.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Batches - Flexible cohorts (track and instructor optional; assignable later)
export const batches = pgTable("batches", {
  id: serial("id").primaryKey(),
  batchCode: text("batch_code").notNull(),
  batchName: text("batch_name").notNull(),
  trackId: integer("track_id").references(() => tracks.id, { onDelete: "set null" }),
  primaryInstructorId: varchar("primary_instructor_id").references(() => users.id),
  status: varchar("status").default("active").notNull(), // 'active', 'completed', 'archived'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
});

// Enrollments - Student enrollment in batches
export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => users.id),
  status: varchar("status").default("active").notNull(), // 'active', 'dropped', 'completed'
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  enrolledBy: varchar("enrolled_by").notNull().references(() => users.id),
  droppedAt: timestamp("dropped_at"),
  droppedReason: text("dropped_reason"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Batch Co-Instructors - Additional instructors/TAs for a batch
export const batchCoInstructors = pgTable("batch_co_instructors", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  role: varchar("role").default("co_instructor").notNull(), // 'co_instructor', 'ta'
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id),
});

// Student progress tracking
export const studentProgress = pgTable("student_progress", {
  id: serial("id").primaryKey(),
  studentId: varchar("student_id").notNull().references(() => users.id),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  batchId: integer("batch_id").references(() => batches.id),
  proficiencyLevel: integer("proficiency_level").default(0).notNull(), // 0-4 (0=not started, 1-4=levels)
  lastAccessed: timestamp("last_accessed"),
  lastEvaluatedAt: timestamp("last_evaluated_at"),
  evaluatedBy: varchar("evaluated_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit logs - Track all sensitive operations
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // 'CREATE_CHAPTER', 'PUBLISH_CHAPTER', 'ENROLL_STUDENT', etc.
  resourceType: text("resource_type").notNull(), // 'chapter', 'batch', 'enrollment', etc.
  resourceId: text("resource_id").notNull(),
  changes: jsonb("changes"), // { before: {...}, after: {...} }
  timestamp: timestamp("timestamp").defaultNow(),
  requestId: text("request_id"), // for tracing
});

// System settings - Configuration key-value store
export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
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
}));

export const tracksRelations = relations(tracks, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [tracks.createdBy],
    references: [users.id],
  }),
  chapters: many(chapters),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
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
}));

export const audioFilesRelations = relations(audioFiles, ({ one, many }) => ({
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

export const batchesRelations = relations(batches, ({ one, many }) => ({
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
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
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

export const insertTrackSchema = createInsertSchema(tracks).omit({ id: true, createdAt: true, updatedAt: true, createdBy: true, order: true });
export const selectTrackSchema = createSelectSchema(tracks);

export const insertChapterSchema = createInsertSchema(chapters).omit({ id: true, createdAt: true, updatedAt: true, order: true, createdBy: true, lastEditedBy: true, publishedAt: true });
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

export const insertBatchSchema = createInsertSchema(batches).omit({ id: true, createdAt: true, updatedAt: true });
export const selectBatchSchema = createSelectSchema(batches);

export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({ id: true, enrolledAt: true, updatedAt: true });
export const selectEnrollmentSchema = createSelectSchema(enrollments);

export const insertBatchCoInstructorSchema = createInsertSchema(batchCoInstructors).omit({ id: true, assignedAt: true });
export const selectBatchCoInstructorSchema = createSelectSchema(batchCoInstructors);

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true });
export const selectAuditLogSchema = createSelectSchema(auditLogs);

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({ updatedAt: true });
export const selectSystemSettingSchema = createSelectSchema(systemSettings);

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;

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
