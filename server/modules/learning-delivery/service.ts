/**
 * Learning Delivery Module - Service Layer
 * Business logic for student progress and content delivery
 */

import { learningStorage } from './storage';
import type { StudentProgressDTO, ChapterAccessDTO, ProgressQueryFilters, AvailableChapterDTO, ChapterBundleDTO, ChapterBundleQuery, ChapterInclude } from './types';
import { LEARNING_DELIVERY_EVENTS } from './events';
import { contentService } from '../content-publishing';
import { mediaService } from '../media-pipeline';
import { db } from '../../db';
import { batches, batchCoInstructors, enrollments, chapters, studentProgress } from '@shared/schema';
import { eq, and, or, inArray } from 'drizzle-orm';

export class LearningService {
  /**
   * Get student progress (students can only see own progress)
   */
  async getStudentProgress(
    requestingUserId: string,
    isStudent: boolean,
    filters: ProgressQueryFilters = {}
  ): Promise<StudentProgressDTO[]> {
    // Students can only view their own progress
    if (isStudent) {
      filters.studentId = requestingUserId;
    }

    return learningStorage.getStudentProgress(filters);
  }

  /**
   * Track chapter access (auto-update lastAccessed)
   */
  async trackChapterAccess(accessData: ChapterAccessDTO): Promise<void> {
    const { chapterId, studentId, batchId } = accessData;

    // Validate chapter exists
    const chapterExists = await learningStorage.chapterExists(chapterId);
    if (!chapterExists) {
      throw new Error(`Chapter ${chapterId} not found`);
    }

    // If batchId provided, validate enrollment
    if (batchId) {
      const isEnrolled = await learningStorage.isStudentEnrolled(studentId, batchId);
      if (!isEnrolled) {
        throw new Error(`Student ${studentId} not enrolled in batch ${batchId}`);
      }
    }

    await learningStorage.trackChapterAccess(studentId, chapterId, batchId);

    // Event stub (for future EventBus integration)
    console.log(LEARNING_DELIVERY_EVENTS.CHAPTER_ACCESSED, {
      studentId,
      chapterId,
      batchId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get chapters available to student (based on active enrollments)
   */
  async getAvailableChapters(studentId: string): Promise<AvailableChapterDTO[]> {
    return learningStorage.getAvailableChapters(studentId);
  }

  /**
   * Facade: List tracks for learning (proxy to content module)
   */
  async listTracks() {
    return contentService.listTracks();
  }

  /**
   * Facade: List chapters by track (proxy to content module)
   */
  async listChaptersByTrack(trackId: number) {
    return contentService.getChaptersByTrack(trackId);
  }

  /**
   * Facade: Unified chapter bundle (opt-in sections)
   * Defaults: include = ['chapter','progress'] to keep payload light
   */
  async getChapterBundle(
    requestingUserId: string,
    chapterId: number,
    query: ChapterBundleQuery = {}
  ): Promise<ChapterBundleDTO> {
    const include: ChapterInclude[] = (query.include && query.include.length)
      ? query.include
      : ['chapter', 'progress'];

    const script = query.script;

    const result: ChapterBundleDTO = {};

    if (include.includes('chapter')) {
      result.chapter = await contentService.getChapter(chapterId);
    }

    if (include.includes('segments')) {
      // If no script provided, default to 'te' to avoid tripling payload
      const segScript = (script || 'te') as 'te' | 'hi' | 'en';
      result.textSegments = await contentService.getSegmentsByChapter(chapterId, segScript);
    }

    if (include.includes('audio')) {
      result.audioFiles = await mediaService.listAudioFilesByChapter(chapterId);
    }

    if (include.includes('mappings')) {
      result.segmentMappings = await mediaService.listMappingsByChapter(chapterId);
    }

    if (include.includes('progress')) {
      const rows = await learningStorage.getStudentProgress({ studentId: requestingUserId, chapterId });
      result.progress = rows[0] || null;
    }

    return result;
  }

  /**
   * Get student details with proficiency matrix (instructor view)
   * Instructors can only see students in their batches
   */
  async getStudentDetails(requestingUserId: string, studentId: string, isAdmin: boolean): Promise<any> {
    const studentDetails = await learningStorage.getStudentDetailsWithProgress(studentId);
    
    if (!studentDetails) {
      return null;
    }

    // If not admin, verify instructor is teaching this student's batch
    if (!isAdmin && studentDetails.enrollment) {
      const [batchInstructor] = await db
        .select({ id: batches.id })
        .from(batches)
        .where(
          and(
            eq(batches.id, studentDetails.enrollment.batchId),
            eq(batches.primaryInstructorId, requestingUserId)
          )
        )
        .limit(1);

      if (!batchInstructor) {
        // Also check co-instructors
        const [coInstructor] = await db
          .select({ id: batchCoInstructors.id })
          .from(batchCoInstructors)
          .where(
            and(
              eq(batchCoInstructors.batchId, studentDetails.enrollment.batchId),
              eq(batchCoInstructors.instructorId, requestingUserId)
            )
          )
          .limit(1);

        if (!coInstructor) {
          return null; // Instructor doesn't have access to this student
        }
      }
    }

    return studentDetails;
  }

  /**
   * Get student's proficiency history organized by track (for track-wise progress view)
   * Returns all tracks the student has studied across their batch enrollments
   * Only instructors can view their students
   */
  async getStudentTrackProgress(
    requestingUserId: string,
    studentId: string,
    isAdmin: boolean
  ): Promise<any> {
    // Get student basic info
    const student = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, studentId),
    });

    if (!student) return null;

    // Get all active enrollments for the student
    const studentEnrollments = await db
      .select({
        enrollmentId: enrollments.id,
        batchId: batches.id,
        trackId: batches.trackId,
      })
      .from(enrollments)
      .innerJoin(batches, eq(enrollments.batchId, batches.id))
      .where(
        and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.status, 'active')
        )
      );

    // Permission check: instructor can only view their students
    if (!isAdmin && studentEnrollments.length > 0) {
      const hasAccess = await Promise.all(
        studentEnrollments.map(async (enrollment) => {
          // Check if instructor is primary instructor
          const isPrimary = await db
            .select({ id: batches.id })
            .from(batches)
            .where(
              and(
                eq(batches.id, enrollment.batchId),
                eq(batches.primaryInstructorId, requestingUserId)
              )
            )
            .limit(1);

          if (isPrimary.length > 0) return true;

          // Check if instructor is co-instructor
          const isCoInstructor = await db
            .select({ id: batchCoInstructors.id })
            .from(batchCoInstructors)
            .where(
              and(
                eq(batchCoInstructors.batchId, enrollment.batchId),
                eq(batchCoInstructors.instructorId, requestingUserId)
              )
            )
            .limit(1);

          return isCoInstructor.length > 0;
        })
      );

      if (!hasAccess.some((access) => access)) {
        return null; // Instructor has no access to this student's batches
      }
    }

    // Get all unique track IDs from enrollments
    const trackIds = [...new Set(
      studentEnrollments
        .map((e) => e.trackId)
        .filter((id): id is number => id !== null)
    )];

    if (trackIds.length === 0) {
      return {
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
        },
        trackProgress: [],
      };
    }

    // For each track, fetch chapters + proficiency
    const trackProgress = await Promise.all(
      trackIds.map((trackId) => this.buildTrackProgress(studentId, trackId))
    );

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
      },
      trackProgress: trackProgress.filter(
        (track): track is any => track !== null
      ),
    };
  }

  /**
   * Build track progress data for a specific student and track
   * Includes all chapters and their proficiency levels
   */
  private async buildTrackProgress(
    studentId: string,
    trackId: number
  ): Promise<any> {
    const track = await db.query.tracks.findFirst({
      where: (t, { eq }) => eq(t.id, trackId),
    });

    if (!track) return null;

    // Get all chapters in the track
    const chapterList = await db.query.chapters.findMany({
      where: (c, { eq }) => eq(c.trackId, trackId),
      orderBy: (c) => c.order,
    });

    // Get all student progress for this track's chapters
    const chapterIds = chapterList.map((ch) => ch.id);
    let progressByChapter: Record<number, any> = {};

    if (chapterIds.length > 0) {
      const progress = await db.query.studentProgress.findMany({
        where: (sp, { eq, and, inArray }) =>
          and(
            eq(sp.studentId, studentId),
            inArray(sp.chapterId, chapterIds)
          ),
      });

      // Map progress by chapter ID for quick lookup
      progress.forEach((p) => {
        progressByChapter[p.chapterId] = p;
      });
    }

    // Compute completed chapters (proficiency >= 3)
    const completedChapters = Object.values(progressByChapter).filter(
      (p) => p?.proficiencyLevel !== null && p?.proficiencyLevel >= 3
    ).length;

    // Fetch evaluator names for all chapters with evaluations
    const evaluatorIds = new Set(
      Object.values(progressByChapter)
        .map((p) => p?.evaluatedBy)
        .filter((id): id is string => id !== null && id !== undefined)
    );

    let evaluatorNames: Record<string, string> = {};
    if (evaluatorIds.size > 0) {
      const evaluators = await db.query.users.findMany({
        where: (u, { inArray }) => inArray(u.id, Array.from(evaluatorIds)),
      });
      evaluators.forEach((user) => {
        evaluatorNames[user.id] = `${user.firstName} ${user.lastName}`;
      });
    }

    return {
      trackId: track.id,
      trackOrder: track.number,
      trackTitle: track.title,
      trackDescription: track.description || '',
      completedChapters,
      totalChapters: chapterList.length,
      chapters: chapterList.map((ch) => {
        const progress = progressByChapter[ch.id];
        return {
          chapterId: ch.id,
          chapterOrder: ch.order,
          chapterTitle: ch.title,
          chapterCode: ch.code || `CH${ch.order}`,
          proficiencyLevel: progress?.proficiencyLevel ?? null,
          lastEvaluatedAt: progress?.lastEvaluatedAt
            ? progress.lastEvaluatedAt.toISOString()
            : null,
          evaluatedBy: progress?.evaluatedBy
            ? evaluatorNames[progress.evaluatedBy] || progress.evaluatedBy
            : null,
          notes: progress?.notes ?? null,
        };
      }),
    };
  }
}

export const learningService = new LearningService();
