/**
 * Learning Delivery Module - Data Access Layer
 * Database operations for student progress and content delivery
 */

import { db } from '../../db';
import { studentProgress, chapters, tracks, batches, enrollments } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';
import type { StudentProgressDTO, ProgressQueryFilters, AvailableChapterDTO } from './types';

export class LearningStorage {
  /**
   * Get student progress with optional filters
   */
  async getStudentProgress(filters: ProgressQueryFilters): Promise<StudentProgressDTO[]> {
    const conditions = [];
    
    if (filters.studentId) {
      conditions.push(eq(studentProgress.studentId, filters.studentId));
    }
    if (filters.chapterId) {
      conditions.push(eq(studentProgress.chapterId, filters.chapterId));
    }
    if (filters.batchId) {
      conditions.push(eq(studentProgress.batchId, filters.batchId));
    }

    const results = await db
      .select({
        id: studentProgress.id,
        studentId: studentProgress.studentId,
        chapterId: studentProgress.chapterId,
        batchId: studentProgress.batchId,
        proficiencyLevel: studentProgress.proficiencyLevel,
        lastAccessed: studentProgress.lastAccessed,
        lastEvaluatedAt: studentProgress.lastEvaluatedAt,
        evaluatedBy: studentProgress.evaluatedBy,
        notes: studentProgress.notes,
        createdAt: studentProgress.createdAt,
        updatedAt: studentProgress.updatedAt,
        chapterTitle: chapters.title,
        trackName: tracks.name,
        batchName: batches.batchName,
      })
      .from(studentProgress)
      .leftJoin(chapters, eq(studentProgress.chapterId, chapters.id))
      .leftJoin(tracks, eq(chapters.trackId, tracks.id))
      .leftJoin(batches, eq(studentProgress.batchId, batches.id))
      .where(and(...conditions));

    return results;
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
        proficiencyLevel: null, // Not set yet
        lastAccessed: new Date(),
      });
    }
  }

  /**
   * Get available chapters for a student (based on enrollments)
   */
  async getAvailableChapters(studentId: string): Promise<AvailableChapterDTO[]> {
    // Get student's enrolled batches
    const studentEnrollments = await db
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
      );

    if (studentEnrollments.length === 0) {
      return [];
    }

    // Get all chapters for enrolled tracks
    const trackIds = studentEnrollments.map(e => e.trackId).filter((id): id is number => id !== null);
    
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
      .where(inArray(chapters.trackId, trackIds));

    // Get student's progress for these chapters
    const chapterIds = chaptersList.map(c => c.chapterId);
    const progressRecords = await db
      .select()
      .from(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, studentId),
          inArray(studentProgress.chapterId, chapterIds)
        )
      );

    // Combine data
    return chaptersList.map(chapter => {
      const enrollment = studentEnrollments.find(e => e.trackId === chapter.trackId);
      const progress = progressRecords.find(p => p.chapterId === chapter.chapterId);

      return {
        chapterId: chapter.chapterId,
        chapterTitle: chapter.chapterTitle,
        chapterNumber: chapter.chapterNumber,
        trackId: chapter.trackId,
        trackName: chapter.trackName,
        batchId: enrollment?.batchId ?? 0,
        batchName: enrollment?.batchName ?? '',
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
}

export const learningStorage = new LearningStorage();
