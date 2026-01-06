import { Router, Request, Response, NextFunction } from "express";
import { contentService } from "../modules/content-publishing";
import { authMiddleware, requireAdmin } from "../shared/middleware/auth";

const router = Router();

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
    const track = await contentService.createTrack({
      name: req.body.name,
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

// GET /api/chapters/:trackId - List chapters in track
router.get('/chapters/:trackId', async (req: Request, res: Response, next: NextFunction) => {
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

// POST /api/chapters - Create new chapter
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

// POST /api/chapters/:id/move - Reorder chapter (up/down)
router.post('/chapters/:id/move', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = parseInt(req.params.id);
    const { direction } = req.body;

    if (!['up', 'down'].includes(direction)) {
      return res.status(400).json(createErrorResponse(
        "Invalid direction. Must be 'up' or 'down'",
        "INVALID_DIRECTION"
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

export { router as contentRouter };
