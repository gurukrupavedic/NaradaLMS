import { Router, Request, Response, NextFunction } from "express";
import { contentService } from "../modules/content-publishing";
import { authMiddleware, requireContentManager } from "../shared/middleware/auth";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { parseFile } from 'music-metadata';
import { FILE_UPLOAD } from "../../shared/constants";
import { mediaService } from "../modules/media-pipeline";

const router = Router();

// Protect all content routes: authenticated content managers only
router.use(authMiddleware, requireContentManager);

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

/**
 * Track Routes
 */

// GET /api/tracks - List all tracks
router.get('/tracks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tracks = await contentService.listTracks();
    res.json(tracks);
  } catch (error) {
    next(error);
  }
});

// GET /api/tracks/:id - Get specific track by ID
router.get('/tracks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const track = await contentService.getTrack(parseInt(req.params.id));
    if (!track) {
      return res.status(404).json(createErrorResponse("Track not found", "TRACK_NOT_FOUND"));
    }
    res.json(track);
  } catch (error) {
    next(error);
  }
});

// POST /api/tracks - Create new track
router.post('/tracks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json(createErrorResponse('title and description are required', 'MISSING_REQUIRED_FIELDS'));
    }
    const track = await contentService.createTrack({
      title,
      description,
      createdBy: req.body.createdBy || "system"
    });
    res.json(track);
  } catch (error) {
    next(error);
  }
});

// PUT /api/tracks/:id - Update track
router.put('/tracks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trackId = parseInt(req.params.id);
    const track = await contentService.updateTrack(trackId, req.body);
    res.json(track);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tracks/:id - Delete track
router.delete('/tracks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trackId = parseInt(req.params.id);
    await contentService.deleteTrack(trackId);
    res.json({ message: "Track deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// POST /api/tracks/:id/move - Reorder track (up/down)
router.post('/tracks/:id/move', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trackId = parseInt(req.params.id);
    const { direction } = req.body;

    if (!['up', 'down'].includes(direction)) {
      return res.status(400).json(createErrorResponse(
        "Invalid direction. Must be 'up' or 'down'",
        "INVALID_DIRECTION"
      ));
    }

    await contentService.moveTrack(trackId, direction);
    res.json({ message: "Track order updated successfully" });
  } catch (error) {
    next(error);
  }
});

/**
 * Chapter Routes
 */

// Legacy: GET /api/chapters/:trackId - List chapters in track
router.get('/chapters/:trackId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trackId = parseInt(req.params.trackId);
    const chapters = await contentService.getChaptersByTrack(trackId);
    res.json(chapters);
  } catch (error) {
    next(error);
  }
});

// New: GET /tracks/:trackId/chapters - List chapters for a track (namespaced)
router.get('/tracks/:trackId/chapters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trackId = parseInt(req.params.trackId);
    const chapters = await contentService.getChaptersByTrack(trackId);
    res.json(chapters);
  } catch (error) {
    next(error);
  }
});

// GET /api/chapters/:chapterId/details - Get chapter details
router.get('/chapters/:chapterId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const chapter = await contentService.getChapter(chapterId);

    if (!chapter) {
      return res.status(404).json(createErrorResponse("Chapter not found", "CHAPTER_NOT_FOUND"));
    }


    res.json(chapter);
  } catch (error) {
    next(error);
  }
});

// Legacy: POST /api/chapters - Create new chapter
router.post('/chapters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapter = await contentService.createChapter({
      trackId: req.body.trackId,
      title: req.body.title,
      content: req.body.content,
      createdBy: req.body.createdBy || "system"
    });
    res.json(chapter);
  } catch (error) {
    next(error);
  }
});

// New: POST /tracks/:trackId/chapters - Create chapter under track
router.post('/tracks/:trackId/chapters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trackId = parseInt(req.params.trackId);
    const chapter = await contentService.createChapter({
      trackId,
      title: req.body.title,
      content: req.body.content,
      createdBy: req.body.createdBy || "system",
    });
    res.json(chapter);
  } catch (error) { next(error); }
});

// PATCH /api/chapters/:chapterId - Update chapter
router.patch('/chapters/:chapterId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const chapter = await contentService.updateChapter(chapterId, req.body);
    res.json(chapter);
  } catch (error) {
    next(error);
  }
});

// New: PUT /chapters/:chapterId - Update chapter (alias for PATCH)
router.put('/chapters/:chapterId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const chapter = await contentService.updateChapter(chapterId, req.body);
    res.json(chapter);
  } catch (error) { next(error); }
});

// PATCH /api/chapters/:chapterId/status - Publish/unpublish chapter
router.patch('/chapters/:chapterId/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const { status } = req.body;

    if (!['draft', 'published'].includes(status)) {
      return res.status(400).json(createErrorResponse(
        "Invalid status. Must be 'draft' or 'published'",
        "INVALID_STATUS"
      ));
    }

    const chapter = status === 'published'
      ? await contentService.publishChapter(chapterId, req.body.userId || "system")
      : await contentService.unpublishChapter(chapterId, req.body.userId || "system");

    res.json(chapter);
  } catch (error) {
    next(error);
  }
});

// POST /api/chapters/:id/move - Reorder or move to another track
router.post('/chapters/:id/move', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.id);
    const { direction, toTrackId } = req.body as { direction?: 'up'|'down'; toTrackId?: number };

    if (toTrackId && Number.isInteger(toTrackId)) {
      await contentService.moveChapterToTrack(chapterId, Number(toTrackId));
      return res.json({ message: 'Chapter moved to target track' });
    }

    if (!direction || !['up', 'down'].includes(direction)) {
      return res.status(400).json(createErrorResponse(
        "Invalid payload. Provide 'direction' ('up'|'down') or 'toTrackId' (number)",
        "INVALID_MOVE_PAYLOAD"
      ));
    }

    await contentService.moveChapter(chapterId, direction);
    res.json({ message: "Chapter order updated successfully" });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/chapters/:id - Delete chapter
router.delete('/chapters/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.id);
    await contentService.deleteChapter(chapterId);
    res.json({ message: "Chapter deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// New: DELETE /chapters/:chapterId - Alias for consistency
router.delete('/chapters/:chapterId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    await contentService.deleteChapter(chapterId);
    res.json({ message: "Chapter deleted successfully" });
  } catch (error) { next(error); }
});

/**
 * Text Segment Routes
 */

// GET /api/segments/:chapterId/:script - Get segments by chapter and script
router.get('/segments/:chapterId/:script', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const script = req.params.script as 'te' | 'hi' | 'en';

    if (!['te', 'hi', 'en'].includes(script)) {
      return res.status(400).json(createErrorResponse(
        "Invalid script. Must be 'te', 'hi', or 'en'",
        "INVALID_SCRIPT"
      ));
    }

    const segments = await contentService.getSegmentsByChapter(chapterId, script);
    res.json(segments);
  } catch (error) {
    next(error);
  }
});

// GET /api/segments/:chapterId - Get all segments for chapter
router.get('/segments/:chapterId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const segments = await contentService.getSegmentsByChapter(chapterId);
    res.json(segments);
  } catch (error) {
    next(error);
  }
});

// New: Namespaced segments under chapter with optional ?script=te
router.get('/chapters/:chapterId/segments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const scriptParam = req.query.script as string | undefined;
    let script: 'te' | 'hi' | 'en' | undefined = undefined;
    if (scriptParam) {
      if (!['te', 'hi', 'en'].includes(scriptParam)) {
        return res.status(400).json(createErrorResponse(
          "Invalid script. Must be 'te', 'hi', or 'en'",
          "INVALID_SCRIPT"
        ));
      }
      script = scriptParam as 'te' | 'hi' | 'en';
    }
    const segments = await contentService.getSegmentsByChapter(chapterId, script);
    res.json(segments);
  } catch (error) {
    next(error);
  }
});

// POST /api/segments - Create text segment
router.post('/segments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chapterId, script, startPosition, endPosition, order, createdBy } = req.body;

    // Validate required fields
    if (!chapterId || !script || startPosition === undefined || endPosition === undefined) {
      return res.status(400).json(createErrorResponse(
        "Missing required fields: chapterId, script, startPosition, endPosition",
        "MISSING_REQUIRED_FIELDS",
        { received: { chapterId, script, startPosition, endPosition } }
      ));
    }

    // Validate field types
    if (typeof chapterId !== 'number' || typeof script !== 'string' ||
      typeof startPosition !== 'number' || typeof endPosition !== 'number') {
      return res.status(400).json(createErrorResponse(
        "Invalid field types. Expected: chapterId (number), script (string), startPosition (number), endPosition (number)",
        "INVALID_FIELD_TYPES"
      ));
    }

    // Validate position values
    if (startPosition < 0 || endPosition < 0 || startPosition >= endPosition) {
      return res.status(400).json(createErrorResponse(
        "Invalid position values. startPosition must be >= 0 and < endPosition",
        "INVALID_POSITION_VALUES"
      ));
    }

    const segment = await contentService.createSegment({
      chapterId,
      script: script as 'te' | 'hi' | 'en',
      startPosition,
      endPosition,
      order,
      createdBy: createdBy || "system"
    });

    res.json(segment);
  } catch (error) {
    next(error);
  }
});

// New: POST /chapters/:chapterId/segments - Create segment under chapter
router.post('/chapters/:chapterId/segments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const { script, startPosition, endPosition, order, createdBy } = req.body;

    if (!script || startPosition === undefined || endPosition === undefined) {
      return res.status(400).json(createErrorResponse(
        "Missing required fields: script, startPosition, endPosition",
        "MISSING_REQUIRED_FIELDS"
      ));
    }

    const segment = await contentService.createSegment({
      chapterId,
      script: script as 'te' | 'hi' | 'en',
      startPosition,
      endPosition,
      order,
      createdBy: createdBy || 'system',
    });
    res.json(segment);
  } catch (error) { next(error); }
});

// PATCH /api/segments/:segmentId - Update text segment
router.patch('/segments/:segmentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const segmentId = parseInt(req.params.segmentId);
    const segment = await contentService.updateSegment(segmentId, req.body);
    res.json(segment);
  } catch (error) {
    next(error);
  }
});

// New: PUT /chapters/:chapterId/segments/:segmentId - Update segment (alias)
router.put('/chapters/:chapterId/segments/:segmentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const segmentId = parseInt(req.params.segmentId);
    const segment = await contentService.updateSegment(segmentId, req.body);
    res.json(segment);
  } catch (error) { next(error); }
});

// DELETE /api/segments/:segmentId - Delete text segment
router.delete('/segments/:segmentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const segmentId = parseInt(req.params.segmentId);
    await contentService.deleteSegment(segmentId);
    res.json({ message: "Segment deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// New: DELETE /chapters/:chapterId/segments/:segmentId - Delete segment (alias)
router.delete('/chapters/:chapterId/segments/:segmentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const segmentId = parseInt(req.params.segmentId);
    await contentService.deleteSegment(segmentId);
    res.json({ message: 'Segment deleted successfully' });
  } catch (error) { next(error); }
});

// PATCH /api/segments/:chapterId/reorder - Reorder segments
router.patch('/segments/:chapterId/reorder', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const { segmentOrders } = req.body;

    if (!segmentOrders || !Array.isArray(segmentOrders)) {
      return res.status(400).json(createErrorResponse(
        "segmentOrders array is required",
        "MISSING_SEGMENT_ORDERS"
      ));
    }

    await contentService.reorderSegments(chapterId, segmentOrders);
    res.json({ message: "Segments reordered successfully" });
  } catch (error) {
    next(error);
  }
});

// New: POST /chapters/:chapterId/segments/reorder - Reorder segments (namespaced)
router.post('/chapters/:chapterId/segments/reorder', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const { segmentOrders } = req.body;
    if (!segmentOrders || !Array.isArray(segmentOrders)) {
      return res.status(400).json(createErrorResponse(
        'segmentOrders array is required',
        'MISSING_SEGMENT_ORDERS'
      ));
    }
    await contentService.reorderSegments(chapterId, segmentOrders);
    res.json({ message: 'Segments reordered successfully' });
  } catch (error) { next(error); }
});

export { router as contentRouter };

/**
 * Audio File Routes (namespaced under content)
 * These mirror media.routes but under Content Studio namespace.
 */

// Ensure uploads directory exists
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

// GET /chapters/:chapterId/audio - List audio files for chapter
router.get('/chapters/:chapterId/audio', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const files = await mediaService.listAudioFilesByChapter(chapterId);
    res.json(files);
  } catch (error) { next(error); }
});

// POST /chapters/:chapterId/audio - Upload audio file
router.post('/chapters/:chapterId/audio', upload.single('audio'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json(createErrorResponse('No audio file provided', 'NO_FILE_PROVIDED'));
    }
    const chapterId = parseInt(req.params.chapterId);

    let duration = 0;
    try {
      const meta = await parseFile(req.file.path);
      duration = meta.format.duration || 0;
    } catch {}

    const created = await mediaService.uploadAudioFile({
      chapterId,
      filename: req.file.filename,
      displayName: req.file.originalname || req.file.filename,
      fileSize: req.file.size,
      duration: Math.round(duration),
      mimeType: req.file.mimetype,
      uploadedBy: 'system',
    });
    res.json(created);
  } catch (error) { next(error); }
});

// PUT /chapters/:chapterId/audio/:audioFileId - Update audio file metadata
router.put('/chapters/:chapterId/audio/:audioFileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.audioFileId);
    const file = await mediaService.updateAudioFile(id, req.body);
    res.json(file);
  } catch (error) { next(error); }
});

// DELETE /chapters/:chapterId/audio/:audioFileId - Delete audio file
router.delete('/chapters/:chapterId/audio/:audioFileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.audioFileId);
    await mediaService.deleteAudioFile(id);
    res.json({ message: 'Audio file deleted successfully' });
  } catch (error) { next(error); }
});

/**
 * Mapping Routes (namespaced under content)
 */

// GET /chapters/:chapterId/mappings?audioFileId=123
router.get('/chapters/:chapterId/mappings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const audioFileIdParam = req.query.audioFileId as string | undefined;
    if (audioFileIdParam) {
      const audioFileId = parseInt(audioFileIdParam);
      const mappings = await mediaService.listMappingsByAudioFile(audioFileId);
      return res.json(mappings);
    }
    const mappings = await mediaService.listMappingsByChapter(chapterId);
    res.json(mappings);
  } catch (error) { next(error); }
});

// POST /chapters/:chapterId/mappings - Create mapping
router.post('/chapters/:chapterId/mappings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const { audioFileId, textSegmentId, startTime, endTime } = req.body;
    // Basic validation
    if (!audioFileId || !textSegmentId || startTime === undefined || endTime === undefined) {
      return res.status(400).json(createErrorResponse('Missing required fields', 'MISSING_REQUIRED_FIELDS'));
    }
    const mapping = await mediaService.createMapping({ audioFileId, textSegmentId, startTime, endTime, createdBy: 'system' });
    res.json(mapping);
  } catch (error) { next(error); }
});

// PUT /chapters/:chapterId/mappings/:mappingId - Update mapping timestamps
router.put('/chapters/:chapterId/mappings/:mappingId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const mappingId = parseInt(req.params.mappingId);
    const { startTime, endTime, segmentName } = req.body;
    if (startTime === undefined || endTime === undefined) {
      return res.status(400).json(createErrorResponse('startTime and endTime are required', 'MISSING_TIMESTAMP_FIELDS'));
    }
    // Find mapping to get mediaSegmentId
    const mappings = await mediaService.listMappingsByChapter(chapterId);
    const target = mappings.find(m => m.mappingId === mappingId);
    if (!target) {
      return res.status(404).json(createErrorResponse('Mapping not found', 'MAPPING_NOT_FOUND'));
    }
    const updated = await mediaService.updateMediaSegment(target.mediaSegmentId, {
      startTimestamp: startTime,
      endTimestamp: endTime,
      segmentName,
    } as any);
    res.json(updated);
  } catch (error) { next(error); }
});

// DELETE /chapters/:chapterId/mappings/:mappingId - Delete mapping (and underlying media segment)
router.delete('/chapters/:chapterId/mappings/:mappingId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mappingId = parseInt(req.params.mappingId);
    await mediaService.deleteMappingById(mappingId);
    res.json({ message: 'Mapping deleted successfully' });
  } catch (error) { next(error); }
});
