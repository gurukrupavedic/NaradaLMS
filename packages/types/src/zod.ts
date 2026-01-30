import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
    users,
    tracks,
    chapters,
    audioFiles,
    textSegments,
    mediaSegments,
    segmentMappings,
    batches,
    enrollments,
    batchCoInstructors,
    studentProgress,
    auditLogs,
    systemSettings,
} from "@narada/database/schema";

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

// Types inferred from Zod schemas
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type InsertTrack = z.infer<typeof insertTrackSchema>;
export type InsertChapter = z.infer<typeof insertChapterSchema>;
export type InsertAudioFile = z.infer<typeof insertAudioFileSchema>;
export type InsertTextSegment = z.infer<typeof insertTextSegmentSchema>;
export type InsertMediaSegment = z.infer<typeof insertMediaSegmentSchema>;
export type InsertSegmentMapping = z.infer<typeof insertSegmentMappingSchema>;
export type InsertStudentProgress = z.infer<typeof insertStudentProgressSchema>;
export type InsertBatch = z.infer<typeof insertBatchSchema>;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type InsertBatchCoInstructor = z.infer<typeof insertBatchCoInstructorSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
