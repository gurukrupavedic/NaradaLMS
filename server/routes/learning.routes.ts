/**
 * Learning Delivery Routes
 * Student-facing content delivery and progress tracking
 */

import { Router } from 'express';
import { jwtAuth } from '../middleware/jwt-auth.middleware';
import { learningService } from '../modules/learning-delivery';
import type { ChapterAccessDTO, ProgressQueryFilters, ChapterInclude } from '../modules/learning-delivery/types';

const router = Router();

// Protect all learning routes - users must be authenticated
router.use(jwtAuth);

/**
 * GET /api/learning/my-progress
 * Student self-service track-wise progress
 */
router.get('/my-progress', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const progress = await learningService.getSelfTrackProgress(user.id);
    if (!progress) {
      return res.status(404).json({ error: 'Progress not found' });
    }

    res.json(progress);
  } catch (error: any) {
    console.error('Error fetching self track progress:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch progress' });
  }
});

/**
 * GET /api/learning/my-details
 * Student self-service profile + proficiency matrix
 */
router.get('/my-details', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const details = await learningService.getSelfDetails(user.id);
    if (!details) {
      return res.status(404).json({ error: 'Details not found' });
    }

    res.json(details);
  } catch (error: any) {
    console.error('Error fetching self student details:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch details' });
  }
});

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

/**
 * GET /api/learning/tracks
 * Facade for listing tracks for learning
 */
router.get('/tracks', async (_req, res) => {
  try {
    const tracks = await learningService.listTracks();
    res.json(tracks);
  } catch (error: any) {
    console.error('Error fetching tracks:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch tracks' });
  }
});

/**
 * GET /api/learning/tracks/:trackId/chapters
 * Facade for listing chapters within a track
 */
router.get('/tracks/:trackId/chapters', async (req, res) => {
  try {
    const trackId = parseInt(req.params.trackId);
    if (isNaN(trackId)) {
      return res.status(400).json({ error: 'Invalid track ID' });
    }
    const chapters = await learningService.listChaptersByTrack(trackId);
    res.json(chapters);
  } catch (error: any) {
    console.error('Error fetching chapters by track:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch chapters' });
  }
});

/**
 * GET /api/learning/chapter/:chapterId
 * Unified chapter bundle with opt-in includes and script filter
 * Query: include=chapter,segments,audio,mappings,progress&script=te|hi|en
 * Defaults: include=chapter,progress
 */
router.get('/chapter/:chapterId', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const chapterId = parseInt(req.params.chapterId);
    if (isNaN(chapterId)) {
      return res.status(400).json({ error: 'Invalid chapter ID' });
    }

    const includeParam = (req.query.include as string | undefined) || '';
    const include = includeParam
      ? (includeParam.split(',').map(s => s.trim()).filter(Boolean) as ChapterInclude[])
      : undefined;
    const script = (req.query.script as 'te' | 'hi' | 'en' | undefined);

    const bundle = await learningService.getChapterBundle(user.id, chapterId, { include, script });
    res.json(bundle);
  } catch (error: any) {
    console.error('Error fetching chapter bundle:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch chapter bundle' });
  }
});

export { router as learningRouter };
