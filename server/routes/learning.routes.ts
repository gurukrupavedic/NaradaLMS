/**
 * Learning Delivery Routes
 * Student-facing content delivery and progress tracking
 */

import { Router } from 'express';
import { learningService } from '../modules/learning-delivery';
import type { ChapterAccessDTO, ProgressQueryFilters } from '../modules/learning-delivery/types';

const router = Router();

/**
 * GET /api/learning/progress
 * Get student progress (students see own, instructors/admin can filter)
 */
router.get('/progress', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const isStudent = user.roles?.includes('student') && !user.roles?.includes('instructor') && !user.roles?.includes('admin');
    
    const filters: ProgressQueryFilters = {
      studentId: req.query.studentId as string,
      trackId: req.query.trackId ? parseInt(req.query.trackId as string) : undefined,
      chapterId: req.query.chapterId ? parseInt(req.query.chapterId as string) : undefined,
      batchId: req.query.batchId ? parseInt(req.query.batchId as string) : undefined,
    };

    const progress = await learningService.getStudentProgress(user.id, isStudent, filters);
    res.json(progress);
  } catch (error: any) {
    console.error('Error fetching student progress:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch progress' });
  }
});

/**
 * GET /api/learning/chapters
 * Get chapters available to authenticated student (based on enrollments)
 */
router.get('/chapters', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const chapters = await learningService.getAvailableChapters(user.id);
    res.json(chapters);
  } catch (error: any) {
    console.error('Error fetching available chapters:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch chapters' });
  }
});

/**
 * POST /api/learning/chapters/:chapterId/access
 * Track chapter access (auto-update lastAccessed)
 * Students only
 */
router.post('/chapters/:chapterId/access', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const chapterId = parseInt(req.params.chapterId);
    if (isNaN(chapterId)) {
      return res.status(400).json({ error: 'Invalid chapter ID' });
    }

    const accessData: ChapterAccessDTO = {
      chapterId,
      studentId: user.id,
      batchId: req.body.batchId ? parseInt(req.body.batchId) : undefined,
    };

    await learningService.trackChapterAccess(accessData);
    res.json({ message: 'Chapter access tracked successfully' });
  } catch (error: any) {
    console.error('Error tracking chapter access:', error);
    res.status(400).json({ error: error.message || 'Failed to track access' });
  }
});

export { router as learningRouter };
