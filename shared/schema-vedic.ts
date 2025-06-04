import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
} from "drizzle-orm/pg-core";
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

// User storage table with multi-role support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(), // Email as username per requirements
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  roles: jsonb("roles").$type<string[]>().default(['student']).notNull(), // Multi-role: student, instructor, content_manager, admin
  status: varchar("status").default("active").notNull(), // active, disabled, pending
  invitedBy: varchar("invited_by").references(() => users.id), // Admin who invited this user
  invitedAt: timestamp("invited_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vedic learning tracks - Authentic curriculum structure
export const tracks = pgTable("tracks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().unique(), // Unique track titles
  description: text("description"),
  order: integer("order").notNull(), // Positive integer for ordering
  status: varchar("status").default("draft").notNull(), // draft, published
  estimatedHours: integer("estimated_hours").default(0),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chapters - Wiki-style content with multi-language support
export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // Unique within track
  trackId: integer("track_id").notNull().references(() => tracks.id, { onDelete: "cascade" }),
  order: integer("order").notNull(), // Positive integer for ordering
  status: varchar("status").default("draft").notNull(), // draft, published
  content: jsonb("content").$type<{ te?: string; hi?: string; en?: string }>().default({}), // Multi-language content
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audio files for Vedic recitations
export const audioFiles = pgTable("audio_files", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  reciter: varchar("reciter"),
  duration: decimal("duration", { precision: 10, scale: 3 }), // Duration in seconds
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Text segments for interactive mapping - Reference-based approach
export const textSegments = pgTable("text_segments", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  conceptualName: varchar("conceptual_name").notNull(), // Human-readable segment identifier
  textReferences: jsonb("text_references").$type<{
    te?: { start: number; end: number };
    hi?: { start: number; end: number };
    en?: { start: number; end: number };
  }>().default({}), // Character offsets for each language
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audio timestamp mappings - Links segments to audio timestamps
export const audioMappings = pgTable("audio_mappings", {
  id: serial("id").primaryKey(),
  audioFileId: integer("audio_file_id").notNull().references(() => audioFiles.id, { onDelete: "cascade" }),
  segmentId: integer("segment_id").notNull().references(() => textSegments.id, { onDelete: "cascade" }),
  startTime: decimal("start_time", { precision: 10, scale: 3 }).notNull(), // Start timestamp in seconds
  endTime: decimal("end_time", { precision: 10, scale: 3 }).notNull(), // End timestamp in seconds
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Student progress tracking - Proficiency levels (0=not started, 1-4=levels, 4=certified)
export const studentProgress = pgTable("student_progress", {
  id: serial("id").primaryKey(),
  studentId: varchar("student_id").notNull().references(() => users.id),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  proficiencyLevel: integer("proficiency_level").default(0).notNull(), // 0-4 scale
  lastAccessed: timestamp("last_accessed"),
  timeSpent: integer("time_spent").default(0), // Time spent in minutes
  notes: text("notes"), // Instructor notes
  updatedBy: varchar("updated_by").references(() => users.id), // Instructor who updated progress
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations for proper joins
export const usersRelations = {
  createdTracks: tracks,
  createdChapters: chapters,
  createdAudioFiles: audioFiles,
  createdSegments: textSegments,
  createdMappings: audioMappings,
  progressRecords: studentProgress,
};

export const tracksRelations = {
  chapters: chapters,
  creator: users,
};

export const chaptersRelations = {
  track: tracks,
  creator: users,
  audioFiles: audioFiles,
  textSegments: textSegments,
  progressRecords: studentProgress,
};

export const audioFilesRelations = {
  chapter: chapters,
  creator: users,
  mappings: audioMappings,
};

export const textSegmentsRelations = {
  chapter: chapters,
  creator: users,
  mappings: audioMappings,
};

export const audioMappingsRelations = {
  audioFile: audioFiles,
  segment: textSegments,
  creator: users,
};

export const studentProgressRelations = {
  student: users,
  chapter: chapters,
  updatedByUser: users,
};

// Validation schemas with proper constraints
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  roles: z.array(z.string()).min(1, "At least one role is required"),
  status: z.enum(["active", "disabled", "pending"]),
});

export const selectUserSchema = createSelectSchema(users);

export const insertTrackSchema = createInsertSchema(tracks, {
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  order: z.number().positive("Order must be positive"),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectTrackSchema = createSelectSchema(tracks);

export const insertChapterSchema = createInsertSchema(chapters, {
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  order: z.number().positive("Order must be positive"),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectChapterSchema = createSelectSchema(chapters);

export const insertAudioFileSchema = createInsertSchema(audioFiles).omit({ id: true, createdAt: true });
export const selectAudioFileSchema = createSelectSchema(audioFiles);

export const insertTextSegmentSchema = createInsertSchema(textSegments).omit({ id: true, createdAt: true });
export const selectTextSegmentSchema = createSelectSchema(textSegments);

export const insertAudioMappingSchema = createInsertSchema(audioMappings, {
  startTime: z.number().nonnegative("Start time must be non-negative"),
  endTime: z.number().positive("End time must be positive"),
}).omit({ id: true, createdAt: true });

export const selectAudioMappingSchema = createSelectSchema(audioMappings);

export const insertStudentProgressSchema = createInsertSchema(studentProgress, {
  proficiencyLevel: z.number().min(0, "Level cannot be negative").max(4, "Level cannot exceed 4"),
  timeSpent: z.number().nonnegative("Time spent cannot be negative"),
}).omit({ id: true, updatedAt: true });

export const selectStudentProgressSchema = createSelectSchema(studentProgress);

// Type exports
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