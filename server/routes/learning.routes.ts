/**
 * Learning Delivery Routes
 * Student-facing content delivery and progress tracking
 */

import { Router, Request, Response, NextFunction } from 'express';
import { jwtAuth } from '../middleware/jwt-auth.middleware';
import { requireOrgContext } from '../shared/middleware/org-context';
import { attachLearningTenantOrgContext } from '../shared/middleware/tenant-learning-org-context';
import { learningService } from '../modules/learning-delivery';
import type { ChapterAccessDTO, ProgressQueryFilters, ChapterInclude } from '../modules/learning-delivery/types';
import { catchAsync } from '../utils/catchAsync';

const router = Router();

// Personalized, tenant-scoped JSON: avoid shared HTTP caches mixing orgs across tabs/origins.
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "X-Tenant-Slug, Cookie");
  next();
});

// Protect all learning routes - users must be authenticated, then tenant org from X-Tenant-Slug
router.use(jwtAuth);
router.use(attachLearningTenantOrgContext);
router.use(requireOrgContext);

/**
 * GET /api/learning/my-progress
 * Student self-service track-wise progress
 */
router.get('/my-progress', catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const orgId = req.orgId as string;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const progress = await learningService.getSelfTrackProgress(user.id, orgId);
  if (!progress) {
    return res.status(404).json({ error: 'Progress not found' });
  }

  res.json(progress);
}));

/**
 * GET /api/learning/my-details
 * Student self-service profile + proficiency matrix
 */
router.get('/my-details', catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const orgId = req.orgId as string;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const details = await learningService.getSelfDetails(user.id, orgId);
  if (!details) {
    return res.status(404).json({ error: 'Details not found' });
  }

  res.json(details);
}));

/**
 * GET /api/learning/progress
 * Get student progress (students see own, instructors/admin can filter)
 */
router.get('/progress', catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const orgId = req.orgId as string;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const roles = user.orgRoles ?? [];
  // Note: roles reflect JWT current org; req.orgId is tenant-scoped via X-Tenant-Slug.
  // If these diverge for a power user, consider loading roles from membership for req.orgId.
  const isStudent =
    roles.includes("student") &&
    !roles.includes("instructor") &&
    !roles.includes("admin");

  const filters: ProgressQueryFilters = {
    studentId: req.query.studentId as string,
    trackId: req.query.trackId ? parseInt(req.query.trackId as string) : undefined,
    chapterId: req.query.chapterId ? parseInt(req.query.chapterId as string) : undefined,
    batchId: req.query.batchId ? parseInt(req.query.batchId as string) : undefined,
  };

  const progress = await learningService.getStudentProgress(user.id, orgId, isStudent, filters);
  res.json(progress);
}));

/**
 * GET /api/learning/chapters
 * Get chapters available to authenticated student (based on enrollments)
 */
router.get('/chapters', catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const orgId = req.orgId as string;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const chapters = await learningService.getAvailableChapters(user.id, orgId);
  res.json(chapters);
}));

/**
 * POST /api/learning/chapters/:chapterId/access
 * Track chapter access (auto-update lastAccessed)
 * Students only
 */
router.post('/chapters/:chapterId/access', catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const orgId = req.orgId as string;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const chapterId = parseInt(req.params.chapterId);
  if (isNaN(chapterId)) {
    return res.status(400).json({ error: 'Invalid chapter ID' });
  }

  const accessData: ChapterAccessDTO = {
    orgId,
    chapterId,
    studentId: user.id,
    batchId: req.body.batchId ? parseInt(req.body.batchId) : undefined,
  };

  await learningService.trackChapterAccess(accessData);
  res.json({ message: 'Chapter access tracked successfully' });
}));

/**
 * GET /api/learning/tracks
 * Facade for listing tracks for learning
 */
router.get('/tracks', catchAsync(async (req: Request, res: Response) => {
  const orgId = req.orgId as string;
  const tracks = await learningService.listTracks(orgId);
  res.json(tracks);
}));

/**
 * GET /api/learning/tracks/:trackId/chapters
 * Facade for listing chapters within a track
 */
router.get('/tracks/:trackId/chapters', catchAsync(async (req: Request, res: Response) => {
  const orgId = req.orgId as string;
  const trackId = parseInt(req.params.trackId);
  if (isNaN(trackId)) {
    return res.status(400).json({ error: 'Invalid track ID' });
  }
  const chapters = await learningService.listChaptersByTrack(trackId, orgId);
  res.json(chapters);
}));

/**
 * GET /api/learning/chapter/:chapterId
 * Unified chapter bundle with opt-in includes and script filter
 * Query: include=chapter,segments,audio,mappings,progress&script=te|hi|en
 * Defaults: include=chapter,progress
 */
router.get('/chapter/:chapterId', catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const orgId = req.orgId as string;
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

  const bundle = await learningService.getChapterBundle(user.id, orgId, chapterId, { include, script });
  res.json(bundle);
}));

export { router as learningRouter };
