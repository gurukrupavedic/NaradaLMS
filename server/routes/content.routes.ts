import { Router, Request, Response, NextFunction } from "express";
import { contentService } from "../modules/content-publishing";
import { requireAdmin } from "../shared/middleware/auth";
import { jwtAuth } from "../middleware/jwt-auth.middleware";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { parseFile } from 'music-metadata';
import { FILE_UPLOAD } from "@narada/types";
import { mediaService } from "../modules/media-pipeline";
import { createErrorResponse } from "../shared/utils/api-response";

const router = Router();

// Protect all content routes: authenticated users can READ, admins can WRITE
// We apply requireAdmin selectively on POST/PUT/DELETE routes
router.use(jwtAuth);

/**
 * Track Routes
 */

// GET /api/tracks - List all tracks
router.get('/tracks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Note: batchId parameter is ignored because tracks don't belong to batches
    // Instead, batches belong to ONE track (batch.trackId)
    // The client should use batch.trackId to identify the current track
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

// POST /api/tracks - Create new track (content managers only)
router.post('/tracks', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description } = req.body;
    if (!title || description === undefined) {
      return res.status(400).json(createErrorResponse('title and description are required', 'MISSING_REQUIRED_FIELDS'));
    }
    const user = req.user as Express.User;
    const track = await contentService.createTrack({
      title,
      description,
      createdBy: user.id
    });
    res.json(track);
  } catch (error) {
    next(error);
  }
});

// PUT /api/tracks/:id - Update track (content managers only)
router.put('/tracks/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trackId = parseInt(req.params.id);
    const track = await contentService.updateTrack(trackId, req.body);
    res.json(track);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tracks/:id - Delete track (content managers only)
router.delete('/tracks/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trackId = parseInt(req.params.id);
    await contentService.deleteTrack(trackId);
    res.json({ message: "Track deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// POST /api/tracks/:id/move - Reorder track (up/down) (content managers only)
router.post('/tracks/:id/move', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
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

// GET /tracks/:trackId/chapters - List chapters for a track
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
router.get('/chapters/:chapterId/details', async (req: Request, res: Response, next: NextFunction) => {
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

// POST /tracks/:trackId/chapters - Create chapter under track
router.post('/tracks/:trackId/chapters', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as Express.User;
    const trackId = parseInt(req.params.trackId);
    const chapter = await contentService.createChapter({
      trackId,
      title: req.body.title,
      content: req.body.content,
      createdBy: user.id,
    });
    res.json(chapter);
  } catch (error) { next(error); }
});

// PATCH /api/chapters/:chapterId - Update chapter
router.patch('/chapters/:chapterId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const chapter = await contentService.updateChapter(chapterId, req.body);
    res.json(chapter);
  } catch (error) {
    next(error);
  }
});

// New: PUT /chapters/:chapterId - Update chapter (alias for PATCH)
router.put('/chapters/:chapterId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const chapter = await contentService.updateChapter(chapterId, req.body);
    res.json(chapter);
  } catch (error) { next(error); }
});

// PATCH /api/chapters/:chapterId/status - Publish/unpublish chapter
router.patch('/chapters/:chapterId/status', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const { status } = req.body;

    if (!['draft', 'published'].includes(status)) {
      return res.status(400).json(createErrorResponse(
        "Invalid status. Must be 'draft' or 'published'",
        "INVALID_STATUS"
      ));
    }

    const user = req.user as Express.User;
    const chapter = status === 'published'
      ? await contentService.publishChapter(chapterId, user.id)
      : await contentService.unpublishChapter(chapterId, user.id);

    res.json(chapter);
  } catch (error) {
    next(error);
  }
});

// POST /api/chapters/:id/move - Reorder or move to another track
router.post('/chapters/:id/move', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.id);
    const { direction, toTrackId } = req.body as { direction?: 'up' | 'down'; toTrackId?: number };

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
router.delete('/chapters/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.id);
    await contentService.deleteChapter(chapterId);
    res.json({ message: "Chapter deleted successfully" });
  } catch (error) {
    next(error);
  }
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
router.post('/segments', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chapterId, script, startPosition, endPosition, order } = req.body;

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

    const user = req.user as Express.User;
    const segment = await contentService.createSegment({
      chapterId,
      script: script as 'te' | 'hi' | 'en',
      startPosition,
      endPosition,
      order,
      createdBy: user.id
    });

    res.json(segment);
  } catch (error) {
    next(error);
  }
});

// New: POST /chapters/:chapterId/segments - Create segment under chapter
router.post('/chapters/:chapterId/segments', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const { script, startPosition, endPosition, order } = req.body;

    if (!script || startPosition === undefined || endPosition === undefined) {
      return res.status(400).json(createErrorResponse(
        "Missing required fields: script, startPosition, endPosition",
        "MISSING_REQUIRED_FIELDS"
      ));
    }

    if (!['te', 'hi', 'en'].includes(script)) {
      return res.status(400).json(createErrorResponse(
        "Invalid script. Must be 'te', 'hi', or 'en'",
        "INVALID_SCRIPT"
      ));
    }

    if (
      typeof startPosition !== 'number' ||
      typeof endPosition !== 'number' ||
      (order !== undefined && typeof order !== 'number')
    ) {
      return res.status(400).json(createErrorResponse(
        "Invalid field types for startPosition/endPosition/order",
        "INVALID_FIELD_TYPES"
      ));
    }

    if (startPosition < 0 || endPosition < 0 || startPosition >= endPosition) {
      return res.status(400).json(createErrorResponse(
        "Invalid position values. startPosition must be >= 0 and < endPosition",
        "INVALID_POSITION_VALUES"
      ));
    }

    const user = req.user as Express.User;
    const segment = await contentService.createSegment({
      chapterId,
      script: script as 'te' | 'hi' | 'en',
      startPosition,
      endPosition,
      order,
      createdBy: user.id,
    });
    res.json(segment);
  } catch (error) { next(error); }
});

// PATCH /api/segments/:segmentId - Update text segment
router.patch('/segments/:segmentId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const segmentId = parseInt(req.params.segmentId);
    const segment = await contentService.updateSegment(segmentId, req.body);
    res.json(segment);
  } catch (error) {
    next(error);
  }
});

// New: PUT /chapters/:chapterId/segments/:segmentId - Update segment (alias)
router.put('/chapters/:chapterId/segments/:segmentId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const segmentId = parseInt(req.params.segmentId);
    const segment = await contentService.updateSegment(segmentId, req.body);
    res.json(segment);
  } catch (error) { next(error); }
});

// DELETE /api/segments/:segmentId - Delete text segment
router.delete('/segments/:segmentId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const segmentId = parseInt(req.params.segmentId);
    await contentService.deleteSegment(segmentId);
    res.json({ message: "Segment deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// New: DELETE /chapters/:chapterId/segments/:segmentId - Delete segment (alias)
router.delete('/chapters/:chapterId/segments/:segmentId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const segmentId = parseInt(req.params.segmentId);
    await contentService.deleteSegment(segmentId);
    res.json({ message: 'Segment deleted successfully' });
  } catch (error) { next(error); }
});

// New: DELETE /chapters/:chapterId/segments/all - Clear all segments for a script
router.delete('/chapters/:chapterId/segments/all/clear', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const script = req.query.script as string;

    if (!script || !['te', 'hi', 'en'].includes(script)) {
      return res.status(400).json(createErrorResponse(
        "Invalid script. Must be 'te', 'hi', or 'en'",
        "INVALID_SCRIPT"
      ));
    }

    await contentService.deleteSegmentsByChapter(chapterId, script as 'te' | 'hi' | 'en');
    res.json({ message: 'All segments cleared successfully' });
  } catch (error) { next(error); }
});

// POST /chapters/:chapterId/segments/reorder - Reorder segments
router.post('/chapters/:chapterId/segments/reorder', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const { script, segmentOrders } = req.body;

    if (!script || !['te', 'hi', 'en'].includes(script)) {
      return res.status(400).json(createErrorResponse(
        "script is required and must be 'te', 'hi', or 'en'",
        'INVALID_SCRIPT'
      ));
    }

    if (!segmentOrders || !Array.isArray(segmentOrders)) {
      return res.status(400).json(createErrorResponse(
        'segmentOrders array is required',
        'MISSING_SEGMENT_ORDERS'
      ));
    }

    await contentService.reorderSegments(chapterId, script, segmentOrders);
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
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only audio and video files are allowed'));
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
router.post('/chapters/:chapterId/audio', requireAdmin, upload.single('audio'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json(createErrorResponse('No audio file provided', 'NO_FILE_PROVIDED'));
    }
    const chapterId = parseInt(req.params.chapterId);

    let duration = 0;
    try {
      const meta = await parseFile(req.file.path);
      duration = meta.format.duration || 0;
    } catch { }

    const user = req.user as Express.User;
    const created = await mediaService.uploadAudioFile({
      chapterId,
      filename: req.file.filename,
      displayName: req.file.originalname || req.file.filename,
      fileSize: req.file.size,
      duration: Math.round(duration),
      mimeType: req.file.mimetype,
      uploadedBy: user.id,
    });
    res.json(created);
  } catch (error) { next(error); }
});

// PUT /chapters/:chapterId/audio/:audioFileId - Update audio file metadata
router.put('/chapters/:chapterId/audio/:audioFileId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.audioFileId);
    const file = await mediaService.updateAudioFile(id, req.body);
    res.json(file);
  } catch (error) { next(error); }
});

// DELETE /chapters/:chapterId/audio/:audioFileId - Delete audio file
router.delete('/chapters/:chapterId/audio/:audioFileId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
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

// POST /chapters/:chapterId/mappings - Create mapping (Bundle E: ms wire contract)
router.post('/chapters/:chapterId/mappings', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { audioFileId, textSegmentId, startMs, endMs } = req.body;
    if (!audioFileId || !textSegmentId || startMs === undefined || endMs === undefined) {
      return res.status(400).json(createErrorResponse('Missing required fields', 'MISSING_REQUIRED_FIELDS'));
    }
    const user = req.user as Express.User;
    const mapping = await mediaService.createMapping({ audioFileId, textSegmentId, startMs, endMs, createdBy: user.id });
    res.json(mapping);
  } catch (error) { next(error); }
});

// PUT /chapters/:chapterId/mappings/:mappingId - Update mapping timestamps (ms)
router.put('/chapters/:chapterId/mappings/:mappingId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const mappingId = parseInt(req.params.mappingId);
    const { startMs, endMs, segmentName } = req.body;
    if (startMs === undefined || endMs === undefined) {
      return res.status(400).json(createErrorResponse('startMs and endMs are required', 'MISSING_TIMESTAMP_FIELDS'));
    }
    const mappings = await mediaService.listMappingsByChapter(chapterId);
    const target = mappings.find(m => m.mappingId === mappingId);
    if (!target) {
      return res.status(404).json(createErrorResponse('Mapping not found', 'MAPPING_NOT_FOUND'));
    }
    const updated = await mediaService.updateMediaSegment(target.mediaSegmentId, {
      startMs,
      endMs,
      segmentName,
    } as any);
    res.json(updated);
  } catch (error) { next(error); }
});

// DELETE /chapters/:chapterId/mappings/:mappingId - Delete mapping (and underlying media segment)
router.delete('/chapters/:chapterId/mappings/:mappingId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mappingId = parseInt(req.params.mappingId);
    await mediaService.deleteMappingById(mappingId);
    res.json({ message: 'Mapping deleted successfully' });
  } catch (error) { next(error); }
});

// New: DELETE /chapters/:chapterId/mappings/audio/:audioFileId/segment/:segmentId - Delete by natural key
router.delete('/chapters/:chapterId/mappings/audio/:audioFileId/segment/:segmentId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const audioFileId = parseInt(req.params.audioFileId);
    const segmentId = parseInt(req.params.segmentId);
    await mediaService.deleteMappingByTextSegment(segmentId, audioFileId);
    res.json({ message: 'Mapping deleted successfully' });
  } catch (error) { next(error); }
});

// PATCH /chapters/:chapterId/mappings/audio/:audioFileId/segment/:segmentId - Update by natural key (ms)
router.patch('/chapters/:chapterId/mappings/audio/:audioFileId/segment/:segmentId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const audioFileId = parseInt(req.params.audioFileId);
    const segmentId = parseInt(req.params.segmentId);
    const { startMs, endMs } = req.body;

    if (startMs === undefined || endMs === undefined) {
      return res.status(400).json(createErrorResponse('startMs and endMs are required', 'MISSING_TIMESTAMP_FIELDS'));
    }

    const mappings = await mediaService.listMappingsByAudioFile(audioFileId);
    const target = mappings.find(m => m.textSegmentId === segmentId);

    if (!target) {
      return res.status(404).json(createErrorResponse('Mapping not found for this segment and audio file', 'MAPPING_NOT_FOUND'));
    }

    const updated = await mediaService.updateMediaSegment(target.mediaSegmentId, {
      startMs,
      endMs,
    } as any);

    res.json(updated);
  } catch (error) { next(error); }
});
