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
  decimal,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  roles: jsonb("roles").$type<string[]>().default([]).notNull(), // ['student', 'instructor', 'content_manager', 'admin']
  status: varchar("status").default("active").notNull(), // 'active', 'disabled', 'pending'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Learning tracks table
export const tracks = pgTable("tracks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  order: integer("order").notNull(),
  status: varchar("status").default("draft").notNull(), // 'draft', 'published'
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chapters table
export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  trackId: integer("track_id").references(() => tracks.id).notNull(),
  title: text("title").notNull(),
  order: integer("order").notNull(),
  status: varchar("status").default("draft").notNull(), // 'draft', 'published'
  content: jsonb("content").$type<{
    te?: string;
    hi?: string;
    en?: string;
  }>().default({}).notNull(),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audio files table
export const audioFiles = pgTable("audio_files", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").references(() => chapters.id).notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  reciter: text("reciter"),
  duration: decimal("duration", { precision: 10, scale: 3 }), // in seconds
  fileSize: integer("file_size"), // in bytes
  mimeType: text("mime_type"),
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Text segments table
export const segments = pgTable("segments", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").references(() => chapters.id).notNull(),
  conceptualName: text("conceptual_name").notNull(),
  textReferences: jsonb("text_references").$type<{
    te?: { start: number; end: number };
    hi?: { start: number; end: number };
    en?: { start: number; end: number };
  }>().default({}).notNull(),
  order: integer("order").notNull(),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audio-segment mappings table
export const audioSegmentMappings = pgTable("audio_segment_mappings", {
  id: serial("id").primaryKey(),
  audioFileId: integer("audio_file_id").references(() => audioFiles.id).notNull(),
  segmentId: integer("segment_id").references(() => segments.id).notNull(),
  startTime: decimal("start_time", { precision: 10, scale: 3 }).notNull(), // in seconds
  endTime: decimal("end_time", { precision: 10, scale: 3 }).notNull(), // in seconds
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Student progress table
export const studentProgress = pgTable("student_progress", {
  id: serial("id").primaryKey(),
  studentId: varchar("student_id").references(() => users.id).notNull(),
  chapterId: integer("chapter_id").references(() => chapters.id).notNull(),
  proficiencyLevel: integer("proficiency_level").default(0).notNull(), // 0-4
  updatedBy: varchar("updated_by").references(() => users.id).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdTracks: many(tracks, { relationName: "trackCreator" }),
  createdChapters: many(chapters, { relationName: "chapterCreator" }),
  uploadedAudioFiles: many(audioFiles, { relationName: "audioUploader" }),
  createdSegments: many(segments, { relationName: "segmentCreator" }),
  createdMappings: many(audioSegmentMappings, { relationName: "mappingCreator" }),
  studentProgress: many(studentProgress, { relationName: "studentProgress" }),
  progressUpdates: many(studentProgress, { relationName: "progressUpdater" }),
}));

export const tracksRelations = relations(tracks, ({ one, many }) => ({
  creator: one(users, {
    fields: [tracks.createdBy],
    references: [users.id],
    relationName: "trackCreator",
  }),
  chapters: many(chapters),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  track: one(tracks, {
    fields: [chapters.trackId],
    references: [tracks.id],
  }),
  creator: one(users, {
    fields: [chapters.createdBy],
    references: [users.id],
    relationName: "chapterCreator",
  }),
  audioFiles: many(audioFiles),
  segments: many(segments),
  studentProgress: many(studentProgress),
}));

export const audioFilesRelations = relations(audioFiles, ({ one, many }) => ({
  chapter: one(chapters, {
    fields: [audioFiles.chapterId],
    references: [chapters.id],
  }),
  uploader: one(users, {
    fields: [audioFiles.uploadedBy],
    references: [users.id],
    relationName: "audioUploader",
  }),
  mappings: many(audioSegmentMappings),
}));

export const segmentsRelations = relations(segments, ({ one, many }) => ({
  chapter: one(chapters, {
    fields: [segments.chapterId],
    references: [chapters.id],
  }),
  creator: one(users, {
    fields: [segments.createdBy],
    references: [users.id],
    relationName: "segmentCreator",
  }),
  mappings: many(audioSegmentMappings),
}));

export const audioSegmentMappingsRelations = relations(audioSegmentMappings, ({ one }) => ({
  audioFile: one(audioFiles, {
    fields: [audioSegmentMappings.audioFileId],
    references: [audioFiles.id],
  }),
  segment: one(segments, {
    fields: [audioSegmentMappings.segmentId],
    references: [segments.id],
  }),
  creator: one(users, {
    fields: [audioSegmentMappings.createdBy],
    references: [users.id],
    relationName: "mappingCreator",
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
  updater: one(users, {
    fields: [studentProgress.updatedBy],
    references: [users.id],
    relationName: "progressUpdater",
  }),
}));

// Insert schemas
export const upsertUserSchema = createInsertSchema(users);
export const insertTrackSchema = createInsertSchema(tracks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertChapterSchema = createInsertSchema(chapters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertAudioFileSchema = createInsertSchema(audioFiles).omit({
  id: true,
  createdAt: true,
});
export const insertSegmentSchema = createInsertSchema(segments).omit({
  id: true,
  createdAt: true,
});
export const insertAudioSegmentMappingSchema = createInsertSchema(audioSegmentMappings).omit({
  id: true,
  createdAt: true,
});
export const insertStudentProgressSchema = createInsertSchema(studentProgress).omit({
  id: true,
  updatedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTrack = z.infer<typeof insertTrackSchema>;
export type Track = typeof tracks.$inferSelect;
export type InsertChapter = z.infer<typeof insertChapterSchema>;
export type Chapter = typeof chapters.$inferSelect;
export type InsertAudioFile = z.infer<typeof insertAudioFileSchema>;
export type AudioFile = typeof audioFiles.$inferSelect;
export type InsertSegment = z.infer<typeof insertSegmentSchema>;
export type Segment = typeof segments.$inferSelect;
export type InsertAudioSegmentMapping = z.infer<typeof insertAudioSegmentMappingSchema>;
export type AudioSegmentMapping = typeof audioSegmentMappings.$inferSelect;
export type InsertStudentProgress = z.infer<typeof insertStudentProgressSchema>;
export type StudentProgress = typeof studentProgress.$inferSelect;

// Extended types for API responses
export type TrackWithChapters = Track & {
  chapters: Chapter[];
  chapterCount: number;
};

export type ChapterWithDetails = Chapter & {
  track: Track;
  audioFiles: AudioFile[];
  segments: (Segment & {
    mappings: (AudioSegmentMapping & {
      audioFile: AudioFile;
    })[];
  })[];
  studentProgress?: StudentProgress;
};

export type StudentWithProgress = User & {
  progress: (StudentProgress & {
    chapter: Chapter & {
      track: Track;
    };
  })[];
};
