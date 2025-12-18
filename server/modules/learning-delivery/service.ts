/**
 * Learning Delivery Module - Service Layer
 * Business logic for student progress and content delivery
 */

import { learningStorage } from './storage';
import type { StudentProgressDTO, ChapterAccessDTO, ProgressQueryFilters, AvailableChapterDTO } from './types';
import { LEARNING_DELIVERY_EVENTS } from './events';

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
}

export const learningService = new LearningService();
