import { Router, Request, Response, NextFunction } from 'express';
import { mediaService } from '../modules/media-pipeline';
import { requireAdmin } from '../shared/middleware/auth';
import { jwtAuth } from '../middleware/jwt-auth.middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { parseFile } from 'music-metadata';
import { FILE_UPLOAD } from '@narada/types';
import { validateRequest } from '../utils/validation';
import { z } from 'zod';
import { config } from '../config';
import { createErrorResponse } from '../shared/utils/api-response';

const router = Router();

// Protect all media routes - authentication required
router.use(jwtAuth);

// Multer setup (audio only)
const uploadsDir = path.join(process.cwd(), config.uploads.dir);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: config.uploads.maxSize },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) cb(null, true);
    else cb(new Error('Only audio files are allowed'));
  },
});

/**
 * Audio File Routes (list/upload/delete moved to content.routes.ts; PATCH remains for backward compatibility)
 */
router.patch('/audio-files/:audioFileId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.audioFileId);
    const file = await mediaService.updateAudioFile(id, req.body);
    res.json(file);
  } catch (error) { next(error); }
});

/**
 * Media Segment Routes
 */
router.get('/media-segments/:audioFileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const audioFileId = parseInt(req.params.audioFileId);
    const segs = await mediaService.listMediaSegments(audioFileId);
    res.json(segs);
  } catch (error) { next(error); }
});

const bulkSegmentsSchema = z.object({
  body: z.object({
    segments: z.array(z.object({
      audioFileId: z.number(),
      startTime: z.number(),
      endTime: z.number(),
      name: z.string(),
    })),
  }),
});

const segmentSchema = z.object({
  body: z.object({
    audioFileId: z.number(),
    startTimestamp: z.number(),
    endTimestamp: z.number(),
    segmentName: z.string(),
  }),
});

router.post('/media-segments/bulk', requireAdmin, validateRequest(bulkSegmentsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { segments } = req.body;
    // Array check redundant with Zod but harmless
    const created = [] as any[];
    for (const s of segments) {
      const seg = await mediaService.createMediaSegment({
        audioFileId: s.audioFileId,
        startTimestamp: s.startTime,
        endTimestamp: s.endTime,
        segmentName: s.name,
        createdBy: (req as any).user.id,
      });
      created.push(seg);
    }
    res.json(created);
  } catch (error) { next(error); }
});

router.post('/media-segments', requireAdmin, validateRequest(segmentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const seg = await mediaService.createMediaSegment({
      audioFileId: req.body.audioFileId,
      startTimestamp: req.body.startTimestamp,
      endTimestamp: req.body.endTimestamp,
      segmentName: req.body.segmentName,
      createdBy: (req as any).user.id,
    });
    res.json(seg);
  } catch (error) { next(error); }
});

router.delete('/media-segments/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    await mediaService.deleteMediaSegment(id);
    res.json({ message: 'Media segment deleted successfully' });
  } catch (error) { next(error); }
});

/**
 * Segment Mapping Routes (chapter-level audio/mappings moved to content.routes.ts)
 */
router.get('/mappings/audio/:audioFileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const audioFileId = parseInt(req.params.audioFileId);
    const mappings = await mediaService.listMappingsByAudioFile(audioFileId);
    res.json(mappings);
  } catch (error) { next(error); }
});

router.get('/mappings/audio/:audioFileId/count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const audioFileId = parseInt(req.params.audioFileId);
    const mappings = await mediaService.listMappingsByAudioFile(audioFileId);
    res.json({ count: mappings.length });
  } catch (error) { next(error); }
});

export const mediaRouter = router;