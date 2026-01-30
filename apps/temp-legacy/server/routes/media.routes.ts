import { Router, Request, Response, NextFunction } from 'express';
import { mediaService } from '../modules/media-pipeline';
import { authMiddleware, requireContentManager } from '../shared/middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { parseFile } from 'music-metadata';
import { FILE_UPLOAD } from '../../shared/constants';
import { validateRequest } from '../utils/validation';
import { z } from 'zod';

const router = Router();

// Protect all media routes - authentication required
router.use(authMiddleware);

// Error response interface
interface ApiErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createErrorResponse(message: string, code?: string, details?: any): ApiErrorResponse {
  return {
    error: {
      message,
      code,
      details,
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
    },
  };
}

// Multer setup (audio only)
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: FILE_UPLOAD.maxSize },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) cb(null, true);
    else cb(new Error('Only audio files are allowed'));
  },
});

/**
 * Audio File Routes
 */
router.get('/audio-files/:chapterId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const files = await mediaService.listAudioFilesByChapter(chapterId);
    res.json(files);
  } catch (error) { next(error); }
});

router.post('/audio-files/:chapterId/upload', requireContentManager, upload.single('audio'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json(createErrorResponse('No audio file provided', 'NO_FILE_PROVIDED'));
    }
    const chapterId = parseInt(req.params.chapterId);

    let duration = 0;
    try {
      const meta = await parseFile(req.file.path);
      duration = meta.format.duration || 0;

      // S-07: Strict validation - if music-metadata can't parse it, reject it
      if (!meta.format.container && duration === 0) {
        throw new Error("Could not determine audio format");
      }
    } catch (err) {
      // Security: Remove invalid file immediately
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json(createErrorResponse('Invalid audio file content', 'INVALID_AUDIO_FILE'));
    }

    const created = await mediaService.uploadAudioFile({
      chapterId,
      filename: req.file.filename,
      displayName: req.file.originalname || req.file.filename,
      fileSize: req.file.size,
      duration: Math.round(duration),
      mimeType: req.file.mimetype,
      uploadedBy: (req as any).user.id,
    });
    res.json(created);
  } catch (error) { next(error); }
});

router.patch('/audio-files/:audioFileId', requireContentManager, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.audioFileId);
    const file = await mediaService.updateAudioFile(id, req.body);
    res.json(file);
  } catch (error) { next(error); }
});

router.delete('/audio-files/:audioFileId', requireContentManager, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.audioFileId);
    await mediaService.deleteAudioFile(id);
    res.json({ message: 'Audio file deleted successfully' });
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

router.post('/media-segments/bulk', requireContentManager, validateRequest(bulkSegmentsSchema), async (req: Request, res: Response, next: NextFunction) => {
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

router.post('/media-segments', requireContentManager, validateRequest(segmentSchema), async (req: Request, res: Response, next: NextFunction) => {
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

router.delete('/media-segments/:id', requireContentManager, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    await mediaService.deleteMediaSegment(id);
    res.json({ message: 'Media segment deleted successfully' });
  } catch (error) { next(error); }
});

/**
 * Segment Mapping Routes
 */
router.get('/segment-mappings/:chapterId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const mappings = await mediaService.listMappingsByChapter(chapterId);
    res.json(mappings);
  } catch (error) { next(error); }
});

router.get('/mappings/chapter/:chapterId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const mappings = await mediaService.listMappingsByChapter(chapterId);
    res.json(mappings);
  } catch (error) { next(error); }
});

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

router.post('/mappings', requireContentManager, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { audioFileId, textSegmentId, startTime, endTime } = req.body;
    const mapping = await mediaService.createMapping({
      audioFileId,
      textSegmentId,
      startTime,
      endTime,
      createdBy: (req as any).user.id,
    });
    res.json(mapping);
  } catch (error) { next(error); }
});

router.delete('/mappings/:audioFileId/:segmentId', requireContentManager, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const audioFileId = parseInt(req.params.audioFileId);
    const segmentId = parseInt(req.params.segmentId);
    await mediaService.deleteMappingByTextSegment(segmentId, audioFileId);
    res.json({ message: 'Audio mapping deleted successfully' });
  } catch (error) { next(error); }
});

export const mediaRouter = router;