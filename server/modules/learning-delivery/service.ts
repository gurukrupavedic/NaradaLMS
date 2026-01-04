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
import { batches, batchCoInstructors } from '@shared/schema';
import { eq, and, or } from 'drizzle-orm';

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
}

export const learningService = new LearningService();
