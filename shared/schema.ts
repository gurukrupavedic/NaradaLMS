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
  primaryKey
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with multi-role support and invitation system
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(), // Email as username per Q9
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  roles: jsonb("roles").$type<string[]>().default(['student']).notNull(), // Multi-role support per Q8
  status: varchar("status").default("pending").notNull(), // 'active', 'disabled', 'pending'
  invitedBy: varchar("invited_by").references(() => users.id), // Admin invitation system per Q8
  invitedAt: timestamp("invited_at"),
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

// Text segments - Reference-based approach for interactive highlighting
export const textSegments = pgTable("text_segments", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  conceptualName: text("conceptual_name").notNull(), // Human-readable segment identifier per Q3
  textReferences: jsonb("text_references").$type<{
    te?: { start: number; end: number }; // Character offsets for Telugu
    hi?: { start: number; end: number }; // Character offsets for Devanagari  
    en?: { start: number; end: number }; // Character offsets for English/IAST
  }>().default({}).notNull(), // Reference points like PDF highlighting per Q3
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audio timestamp mappings
export const audioMappings = pgTable("audio_mappings", {
  id: serial("id").primaryKey(),
  audioFileId: integer("audio_file_id").notNull().references(() => audioFiles.id, { onDelete: "cascade" }),
  segmentId: integer("segment_id").notNull().references(() => textSegments.id, { onDelete: "cascade" }),
  startTime: real("start_time").notNull(), // in seconds
  endTime: real("end_time").notNull(), // in seconds
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Student progress tracking
export const studentProgress = pgTable("student_progress", {
  id: serial("id").primaryKey(),
  studentId: varchar("student_id").notNull().references(() => users.id),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  proficiencyLevel: integer("proficiency_level").default(0).notNull(), // 0-4 (0=not started, 1-4=levels)
  lastAccessed: timestamp("last_accessed"),
  updatedBy: varchar("updated_by").notNull().references(() => users.id), // instructor who updated
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdTracks: many(tracks),
  createdChapters: many(chapters),
  uploadedAudioFiles: many(audioFiles),
  createdSegments: many(textSegments),
  createdMappings: many(audioMappings),
  studentProgress: many(studentProgress, { relationName: "studentProgress" }),
  updatedProgress: many(studentProgress, { relationName: "updatedProgress" }),
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
  audioMappings: many(audioMappings),
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
  audioMappings: many(audioMappings),
}));

export const audioMappingsRelations = relations(audioMappings, ({ one }) => ({
  audioFile: one(audioFiles, {
    fields: [audioMappings.audioFileId],
    references: [audioFiles.id],
  }),
  segment: one(textSegments, {
    fields: [audioMappings.segmentId],
    references: [textSegments.id],
  }),
  createdBy: one(users, {
    fields: [audioMappings.createdBy],
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
  updatedBy: one(users, {
    fields: [studentProgress.updatedBy],
    references: [users.id],
    relationName: "updatedProgress",
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

export const insertTextSegmentSchema = createInsertSchema(textSegments).omit({ id: true, createdAt: true });
export const selectTextSegmentSchema = createSelectSchema(textSegments);

export const insertAudioMappingSchema = createInsertSchema(audioMappings).omit({ id: true, createdAt: true });
export const selectAudioMappingSchema = createSelectSchema(audioMappings);

export const insertStudentProgressSchema = createInsertSchema(studentProgress).omit({ id: true, updatedAt: true });
export const selectStudentProgressSchema = createSelectSchema(studentProgress);

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

export type InsertAudioMapping = z.infer<typeof insertAudioMappingSchema>;
export type AudioMapping = z.infer<typeof selectAudioMappingSchema>;

export type InsertStudentProgress = z.infer<typeof insertStudentProgressSchema>;
export type StudentProgress = z.infer<typeof selectStudentProgressSchema>;
