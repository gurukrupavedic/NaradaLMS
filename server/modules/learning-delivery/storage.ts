/**
 * Learning Delivery Module - Data Access Layer
 * Database operations for student progress and content delivery
 */

import { db } from '../../db';
import { studentProgress, chapters, tracks, batches, enrollments, users } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';
import type { StudentProgressDTO, ProgressQueryFilters, AvailableChapterDTO } from './types';
import type { ProficiencyLevel } from '@shared/constants';

export class LearningStorage {
  /**
   * Get student progress with optional filters
   * Note: Returns progress records without joins to avoid Drizzle leftJoin bugs
   */
  async getStudentProgress(filters: ProgressQueryFilters): Promise<StudentProgressDTO[]> {
    const conditions = [] as any[];
    
    if (filters.studentId) {
      conditions.push(eq(studentProgress.studentId, filters.studentId));
    }
    if (filters.chapterId) {
      conditions.push(eq(studentProgress.chapterId, filters.chapterId));
    }
    if (filters.batchId) {
      conditions.push(eq(studentProgress.batchId, filters.batchId));
    }

    // Simplified query without joins (avoids Drizzle leftJoin + select bug)
    const baseQuery = db
      .select()
      .from(studentProgress);

    // Apply WHERE only if conditions exist
    const results = conditions.length > 0 
      ? await baseQuery.where(and(...conditions))
      : await baseQuery;

    // Map to DTO (without joined data for now)
    return results.map(row => ({
      id: row.id,
      studentId: row.studentId,
      chapterId: row.chapterId,
      batchId: row.batchId,
      proficiencyLevel: row.proficiencyLevel as ProficiencyLevel,
      lastAccessed: row.lastAccessed,
      lastEvaluatedAt: row.lastEvaluatedAt,
      evaluatedBy: row.evaluatedBy,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      // Joined fields removed - can be added back with separate queries if needed
      chapterTitle: undefined,
      trackName: undefined,
      batchName: undefined,
    }));
  }

  /**
   * Track chapter access (upsert lastAccessed)
   */
  async trackChapterAccess(studentId: string, chapterId: number, batchId?: number): Promise<void> {
    const existing = await db
      .select()
      .from(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, studentId),
          eq(studentProgress.chapterId, chapterId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update lastAccessed
      await db
        .update(studentProgress)
        .set({
          lastAccessed: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(studentProgress.id, existing[0].id));
    } else {
      // Insert new progress record
      await db.insert(studentProgress).values({
        studentId,
        chapterId,
        batchId: batchId ?? null,
        lastAccessed: new Date(),
      });
    }
  }

  /**
   * Get available chapters for a student (based on enrollments)
   * ONE-TO-MANY CONSTRAINT: Student can only have ONE active enrollment
   */
  async getAvailableChapters(studentId: string): Promise<AvailableChapterDTO[]> {
    // Get student's enrolled batch (singular - one-to-many relationship)
    const [studentEnrollment] = await db
      .select({
        batchId: enrollments.batchId,
        trackId: batches.trackId,
        batchName: batches.batchName,
      })
      .from(enrollments)
      .innerJoin(batches, eq(enrollments.batchId, batches.id))
      .where(
        and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.status, 'active')
        )
      )
      .limit(1); // Only ONE enrollment possible

    if (!studentEnrollment || !studentEnrollment.trackId) {
      return []; // No enrollment or no track assigned to batch
    }

    // Get all chapters for the enrolled track (singular)
    const chaptersList = await db
      .select({
        chapterId: chapters.id,
        chapterTitle: chapters.title,
        chapterNumber: chapters.chapterNumber,
        trackId: chapters.trackId,
        trackName: tracks.name,
        status: chapters.status,
      })
      .from(chapters)
      .innerJoin(tracks, eq(chapters.trackId, tracks.id))
      .where(eq(chapters.trackId, studentEnrollment.trackId));

    // Get student's progress for these chapters
    const chapterIds = chaptersList.map(c => c.chapterId);
    const progressRecords = chapterIds.length > 0 
      ? await db
          .select()
          .from(studentProgress)
          .where(
            and(
              eq(studentProgress.studentId, studentId),
              inArray(studentProgress.chapterId, chapterIds)
            )
          )
      : [];

    // Combine data
    return chaptersList.map(chapter => {
      const progress = progressRecords.find(p => p.chapterId === chapter.chapterId);

      return {
        chapterId: chapter.chapterId,
        chapterTitle: chapter.chapterTitle,
        chapterNumber: chapter.chapterNumber,
        trackId: chapter.trackId,
        trackName: chapter.trackName,
        batchId: studentEnrollment.batchId,
        batchName: studentEnrollment.batchName,
        status: chapter.status as 'draft' | 'published',
        progress: progress ? {
          id: progress.id,
          studentId: progress.studentId,
          chapterId: progress.chapterId,
          batchId: progress.batchId,
          proficiencyLevel: progress.proficiencyLevel as any,
          lastAccessed: progress.lastAccessed,
          lastEvaluatedAt: progress.lastEvaluatedAt,
          evaluatedBy: progress.evaluatedBy,
          notes: progress.notes,
          createdAt: progress.createdAt!,
          updatedAt: progress.updatedAt!,
        } : undefined,
      };
    });
  }

  /**
   * Check if chapter exists
   */
  async chapterExists(chapterId: number): Promise<boolean> {
    const result = await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(eq(chapters.id, chapterId))
      .limit(1);
    
    return result.length > 0;
  }

  /**
   * Check if student is enrolled in batch
   */
  async isStudentEnrolled(studentId: string, batchId: number): Promise<boolean> {
    const result = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.batchId, batchId),
          eq(enrollments.status, 'active')
        )
      )
      .limit(1);
    
    return result.length > 0;
  }

  /**
   * Get student details with proficiency matrix
   * Returns: Student profile + enrollment + all chapters with proficiency for their batch
   */
  async getStudentDetailsWithProgress(studentId: string): Promise<any> {
    // Get student info
    const student = await db.query.users.findFirst({ 
      where: (u, { eq }) => eq(u.id, studentId) 
    });
    
    if (!student) return null;

    // Get student's active enrollment (max 1)
    const [enrollment] = await db
      .select({
        enrollmentId: enrollments.id,
        batchId: batches.id,
        batchCode: batches.batchCode,
        batchName: batches.batchName,
        trackId: batches.trackId,
        trackName: tracks.title,
        enrolledAt: enrollments.enrolledAt,
        status: enrollments.status,
      })
      .from(enrollments)
      .innerJoin(batches, eq(enrollments.batchId, batches.id))
      .leftJoin(tracks, eq(batches.trackId, tracks.id))
      .where(
        and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.status, 'active')
        )
      )
      .limit(1);

    if (!enrollment) {
      // Return basic profile if no active enrollment
      return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        enrollment: null,
        proficiencyMatrix: [],
      };
    }

    // If batch has no track, return with empty proficiency matrix
    if (!enrollment.trackId) {
      return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        enrollment: {
          enrollmentId: enrollment.enrollmentId,
          batchId: enrollment.batchId,
          batchCode: enrollment.batchCode,
          batchName: enrollment.batchName,
          trackId: enrollment.trackId,
          trackName: enrollment.trackName,
          enrolledAt: enrollment.enrolledAt,
          status: enrollment.status,
        },
        proficiencyMatrix: [],
      };
    }

    // Get all chapters for the batch's track
    const chaptersList = await db
      .select({
        chapterId: chapters.id,
        chapterTitle: chapters.title,
        chapterNumber: chapters.order,
        status: chapters.status,
      })
      .from(chapters)
      .where(eq(chapters.trackId, enrollment.trackId))
      .orderBy(chapters.order);

    // Get proficiency for all chapters
    const chapterIds = chaptersList.map(c => c.chapterId);
    const progressRecords = chapterIds.length > 0
      ? await db
          .select()
          .from(studentProgress)
          .where(
            and(
              eq(studentProgress.studentId, studentId),
              inArray(studentProgress.chapterId, chapterIds)
            )
          )
      : [];

    // Build proficiency matrix
    const proficiencyMatrix = chaptersList.map(chapter => {
      const progress = progressRecords.find(p => p.chapterId === chapter.chapterId);
      return {
        chapterId: chapter.chapterId,
        chapterTitle: chapter.chapterTitle,
        chapterNumber: chapter.chapterNumber,
        proficiencyLevel: progress?.proficiencyLevel || null,
        lastAccessed: progress?.lastAccessed || null,
        lastEvaluatedAt: progress?.lastEvaluatedAt || null,
        evaluatedBy: progress?.evaluatedBy || null,
        notes: progress?.notes || null,
      };
    });

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      enrollment: {
        enrollmentId: enrollment.enrollmentId,
        batchId: enrollment.batchId,
        batchCode: enrollment.batchCode,
        batchName: enrollment.batchName,
        trackId: enrollment.trackId,
        trackName: enrollment.trackName,
        enrolledAt: enrollment.enrolledAt,
        status: enrollment.status,
      },
      proficiencyMatrix,
    };
  }
}

export const learningStorage = new LearningStorage();
