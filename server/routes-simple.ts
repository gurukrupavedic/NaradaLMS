import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./database-storage";
import { FILE_UPLOAD } from "../shared/constants";
// Removed schema validation for simplified implementation
import multer from "multer";
import path from "path";
import fs from "fs";
import { parseFile } from "music-metadata";

// Configure multer for audio file uploads
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: FILE_UPLOAD.MAX_SIZE_BYTES,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

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

// Global error handling middleware
function globalErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(`Error in ${req.method} ${req.path}:`, err);
  
  // Database connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    return res.status(503).json(createErrorResponse(
      "Database temporarily unavailable",
      "DATABASE_CONNECTION_ERROR",
      { retryAfter: 30 }
    ));
  }
  
  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(422).json(createErrorResponse(
      "Invalid input data",
      "VALIDATION_ERROR",
      err.details
    ));
  }
  
  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json(createErrorResponse(
      "File too large",
      "FILE_SIZE_LIMIT",
      { maxSize: '50MB' }
    ));
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json(createErrorResponse(
      "Unexpected file field",
      "INVALID_FILE_FIELD"
    ));
  }
  
  // Generic server error
  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500 ? "Internal server error" : err.message;
  
  res.status(statusCode).json(createErrorResponse(
    message,
    err.code || "INTERNAL_ERROR",
    statusCode === 500 ? undefined : err.details
  ));
}

/**
 * Register API routes for the Vedic LMS application
 * @param app - Express application instance
 * @returns HTTP server instance
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Static file serving for uploaded audio files
  app.use('/uploads', express.static(uploadsDir));

  // Track routes
  app.get('/api/tracks', async (req, res, next) => {
    try {
      const tracks = await storage.getAllTracks();
      res.json(tracks);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/tracks/:id
   * Get specific track by ID
   * @param id - Track identifier in URL params
   * @returns Track object or 404 if not found
   */
  app.get('/api/tracks/:id', async (req, res, next) => {
    try {
      const track = await storage.getTrack(parseInt(req.params.id));
      if (!track) {
        return res.status(404).json(createErrorResponse("Track not found", "TRACK_NOT_FOUND"));
      }
      res.json(track);
    } catch (error) {
      next(error);
    }
  });

  // Chapter routes
  app.get('/api/chapters/:trackId', async (req, res, next) => {
    try {
      const trackId = parseInt(req.params.trackId);
      const chapters = await storage.getChaptersByTrack(trackId);
      res.json(chapters);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/chapters/:chapterId/details', async (req, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const chapter = await storage.getChapter(chapterId);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }
      console.log('API: Chapter details response:', JSON.stringify(chapter, null, 2));
      res.json(chapter);
    } catch (error) {
      console.error("Error fetching chapter:", error);
      res.status(500).json({ message: "Failed to fetch chapter" });
    }
  });

  app.post('/api/tracks', async (req, res) => {
    try {
      const track = await storage.createTrack({
        ...req.body,
        createdBy: "system"
      });
      res.json(track);
    } catch (error) {
      console.error("Error creating track:", error);
      res.status(500).json({ message: "Failed to create track" });
    }
  });

  app.put('/api/tracks/:id', async (req, res) => {
    try {
      const trackId = parseInt(req.params.id);
      const track = await storage.updateTrack(trackId, req.body);
      res.json(track);
    } catch (error) {
      console.error("Error updating track:", error);
      res.status(500).json({ message: "Failed to update track" });
    }
  });

  app.delete('/api/tracks/:id', async (req, res) => {
    try {
      const trackId = parseInt(req.params.id);
      await storage.deleteTrack(trackId);
      res.json({ message: "Track deleted successfully" });
    } catch (error) {
      console.error("Error deleting track:", error);
      res.status(500).json({ message: "Failed to delete track" });
    }
  });

  app.post('/api/tracks/:id/move', async (req, res) => {
    try {
      const trackId = parseInt(req.params.id);
      const { direction } = req.body;
      
      if (!['up', 'down'].includes(direction)) {
        return res.status(400).json({ message: "Invalid direction. Must be 'up' or 'down'" });
      }
      
      // Get all tracks to determine current positions
      const tracks = await storage.getAllTracks();
      const currentTrack = tracks.find(t => t.id === trackId);
      
      if (!currentTrack) {
        return res.status(404).json({ message: "Track not found" });
      }
      
      // Sort tracks by order to ensure correct positioning
      const sortedTracks = tracks.sort((a, b) => a.order - b.order);
      const currentIndex = sortedTracks.findIndex(t => t.id === trackId);
      
      if (direction === 'up' && currentIndex > 0) {
        // Swap with previous track
        const previousTrack = sortedTracks[currentIndex - 1];
        await storage.updateTrack(trackId, { order: previousTrack.order });
        await storage.updateTrack(previousTrack.id, { order: currentTrack.order });
      } else if (direction === 'down' && currentIndex < sortedTracks.length - 1) {
        // Swap with next track
        const nextTrack = sortedTracks[currentIndex + 1];
        await storage.updateTrack(trackId, { order: nextTrack.order });
        await storage.updateTrack(nextTrack.id, { order: currentTrack.order });
      } else {
        return res.status(400).json({ message: "Cannot move track in that direction" });
      }
      
      res.json({ message: "Track order updated successfully" });
    } catch (error) {
      console.error("Error moving track:", error);
      res.status(500).json({ message: "Failed to move track" });
    }
  });

  app.post('/api/chapters', async (req, res) => {
    try {
      const chapter = await storage.createChapter({
        ...req.body,
        createdBy: "system"
      });
      res.json(chapter);
    } catch (error) {
      console.error("Error creating chapter:", error);
      res.status(500).json({ message: "Failed to create chapter" });
    }
  });

  app.patch('/api/chapters/:chapterId', async (req, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const chapter = await storage.updateChapter(chapterId, req.body);
      res.json(chapter);
    } catch (error) {
      console.error("Error updating chapter:", error);
      res.status(500).json({ message: "Failed to update chapter" });
    }
  });

  // Chapter status toggle (publish/unpublish)
  app.patch('/api/chapters/:chapterId/status', async (req, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const { status } = req.body;
      
      if (!['draft', 'published'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'draft' or 'published'" });
      }
      
      const chapter = await storage.updateChapter(chapterId, { status });
      res.json(chapter);
    } catch (error) {
      console.error("Error updating chapter status:", error);
      res.status(500).json({ message: "Failed to update chapter status" });
    }
  });

  // Chapter ordering
  app.post('/api/chapters/:id/move', async (req, res) => {
    try {
      const chapterId = parseInt(req.params.id);
      const { direction } = req.body;
      
      if (!['up', 'down'].includes(direction)) {
        return res.status(400).json({ message: "Invalid direction. Must be 'up' or 'down'" });
      }
      
      // Get the current chapter to find its track
      const currentChapter = await storage.getChapter(chapterId);
      if (!currentChapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }
      
      // Get all chapters in the same track
      const chapters = await storage.getChaptersByTrack(currentChapter.trackId);
      const sortedChapters = chapters.sort((a, b) => a.order - b.order);
      const currentIndex = sortedChapters.findIndex(c => c.id === chapterId);
      
      if (direction === 'up' && currentIndex > 0) {
        // Swap with previous chapter
        const previousChapter = sortedChapters[currentIndex - 1];
        await storage.updateChapter(chapterId, { order: previousChapter.order });
        await storage.updateChapter(previousChapter.id, { order: currentChapter.order });
      } else if (direction === 'down' && currentIndex < sortedChapters.length - 1) {
        // Swap with next chapter
        const nextChapter = sortedChapters[currentIndex + 1];
        await storage.updateChapter(chapterId, { order: nextChapter.order });
        await storage.updateChapter(nextChapter.id, { order: currentChapter.order });
      } else {
        return res.status(400).json({ message: "Cannot move chapter in that direction" });
      }
      
      res.json({ message: "Chapter order updated successfully" });
    } catch (error) {
      console.error("Error moving chapter:", error);
      res.status(500).json({ message: "Failed to move chapter" });
    }
  });

  app.delete('/api/chapters/:id', async (req, res) => {
    try {
      const chapterId = parseInt(req.params.id);
      await storage.deleteChapter(chapterId);
      res.json({ message: "Chapter deleted successfully" });
    } catch (error) {
      console.error("Error deleting chapter:", error);
      res.status(500).json({ message: "Failed to delete chapter" });
    }
  });

  // Audio file routes
  app.get('/api/audio-files/:chapterId', async (req, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const audioFiles = await storage.getAudioFilesByChapter(chapterId);
      res.json(audioFiles);
    } catch (error) {
      console.error("Error fetching audio files:", error);
      res.status(500).json({ message: "Failed to fetch audio files" });
    }
  });

  app.post('/api/audio-files/:chapterId/upload', upload.single('audio'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json(createErrorResponse("No audio file provided", "NO_FILE_PROVIDED"));
      }

      const chapterId = parseInt(req.params.chapterId);
      
      // Parse audio metadata
      let duration = 0;
      try {
        const audioMetadata = await parseFile(req.file.path);
        duration = audioMetadata.format.duration || 0;
      } catch (error) {
        console.warn("Could not parse audio metadata:", error);
      }

      const audioFile = await storage.createAudioFile({
        chapterId,
        filename: req.file.filename,
        displayName: req.file.originalname || req.file.filename,
        fileSize: req.file.size,
        duration: Math.round(duration),
        uploadedBy: "system"
      });

      res.json(audioFile);
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/audio-files/:audioFileId', async (req, res) => {
    try {
      const audioFileId = parseInt(req.params.audioFileId);
      const audioFile = await storage.updateAudioFile(audioFileId, req.body);
      res.json(audioFile);
    } catch (error) {
      console.error("Error updating audio file:", error);
      res.status(500).json({ message: "Failed to update audio file" });
    }
  });

  app.delete('/api/audio-files/:audioFileId', async (req, res) => {
    try {
      const audioFileId = parseInt(req.params.audioFileId);
      await storage.deleteAudioFile(audioFileId);
      res.json({ message: "Audio file deleted successfully" });
    } catch (error) {
      console.error("Error deleting audio file:", error);
      res.status(500).json({ message: "Failed to delete audio file" });
    }
  });

  // Text segment routes
  app.get('/api/segments/:chapterId/:script', async (req, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const script = req.params.script;
      
      if (!['te', 'hi', 'en'].includes(script)) {
        return res.status(400).json({ message: "Invalid script" });
      }
      
      const segments = await storage.getSegmentsByChapter(chapterId, script);
      
      // Enrich segments with audio mapping data
      const enrichedSegments = await Promise.all(
        segments.map(async (segment) => {
          const mappings = await storage.getMappingsBySegment(segment.id);
          if (mappings.length > 0) {
            const mapping = mappings[0]; // Use first mapping
            return {
              ...segment,
              startTime: mapping.startTime,
              endTime: mapping.endTime,
              audioFileId: mapping.audioFileId
            };
          }
          return segment;
        })
      );
      
      // Prevent HTTP caching to ensure UI sees latest data after mutations
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.json(enrichedSegments);
    } catch (error) {
      console.error("Error fetching segments:", error);
      res.status(500).json({ message: "Failed to fetch segments" });
    }
  });

  // Legacy route for backward compatibility (temporary)
  app.get('/api/segments/:chapterId', async (req, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const segments = await storage.getSegmentsByChapter(chapterId);
      res.json(segments);
    } catch (error) {
      console.error("Error fetching segments:", error);
      res.status(500).json({ message: "Failed to fetch segments" });
    }
  });

  app.post('/api/segments', async (req, res) => {
    try {
      const { chapterId, script, startPosition, endPosition } = req.body;
      
      // Validate required fields
      if (!chapterId || !script || startPosition === undefined || endPosition === undefined) {
        return res.status(400).json({ 
          message: "Missing required fields: chapterId, script, startPosition, endPosition",
          received: { chapterId, script, startPosition, endPosition }
        });
      }
      
      // Validate field types
      if (typeof chapterId !== 'number' || typeof script !== 'string' || 
          typeof startPosition !== 'number' || typeof endPosition !== 'number') {
        return res.status(400).json({ 
          message: "Invalid field types. Expected: chapterId (number), script (string), startPosition (number), endPosition (number)" 
        });
      }
      
      // Validate position values
      if (startPosition < 0 || endPosition < 0 || startPosition >= endPosition) {
        return res.status(400).json({ 
          message: "Invalid position values. startPosition must be >= 0 and < endPosition" 
        });
      }
      
      // Create segment using standardized format
      const segment = await storage.createTextSegment({
        chapterId,
        script,
        startPosition,
        endPosition,
        createdBy: "system"
      });
      
      res.json(segment);
    } catch (error) {
      console.error("Error creating segment:", error);
      res.status(500).json({ 
        message: "Failed to create segment",
        error: error.message 
      });
    }
  });

  app.patch('/api/segments/:segmentId', async (req, res) => {
    try {
      const segmentId = parseInt(req.params.segmentId);
      const segment = await storage.updateTextSegment(segmentId, req.body);
      res.json(segment);
    } catch (error) {
      console.error("Error updating segment:", error);
      res.status(500).json({ message: "Failed to update segment" });
    }
  });

  app.delete('/api/segments/:segmentId', async (req, res) => {
    try {
      const segmentId = parseInt(req.params.segmentId);
      await storage.deleteTextSegment(segmentId);
      res.json({ message: "Segment deleted successfully" });
    } catch (error) {
      console.error("Error deleting segment:", error);
      res.status(500).json({ message: "Failed to delete segment" });
    }
  });

  app.patch('/api/segments/:chapterId/reorder', async (req, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const { segmentOrders } = req.body;
      
      await storage.updateSegmentOrder(chapterId, segmentOrders);
      
      res.json({ message: "Segments reordered successfully" });
    } catch (error) {
      console.error("Error reordering segments:", error);
      res.status(500).json({ message: "Failed to reorder segments" });
    }
  });

  // Media segment routes
  app.get('/api/media-segments/:audioFileId', async (req, res) => {
    try {
      const audioFileId = parseInt(req.params.audioFileId);
      const mediaSegments = await storage.getMediaSegmentsByAudioFile(audioFileId);
      res.json(mediaSegments);
    } catch (error) {
      console.error("Error fetching media segments:", error);
      res.status(500).json({ message: "Failed to fetch media segments" });
    }
  });

  // Media segments bulk creation endpoint
  app.post('/api/media-segments/bulk', async (req, res) => {
    try {
      const { segments } = req.body;
      
      if (!segments || !Array.isArray(segments)) {
        return res.status(400).json({ message: "Segments array is required" });
      }

      const createdSegments = [];
      for (const segment of segments) {
        const mediaSegment = await storage.createMediaSegment({
          audioFileId: segment.audioFileId,
          startTimestamp: segment.startTime,
          endTimestamp: segment.endTime,
          segmentName: segment.name,
          createdBy: "system"
        });
        createdSegments.push(mediaSegment);
      }

      res.json(createdSegments);
    } catch (error) {
      console.error("Error creating media segments:", error);
      res.status(500).json({ message: "Failed to create media segments" });
    }
  });

  app.post('/api/media-segments', async (req, res) => {
    try {
      const mediaSegment = await storage.createMediaSegment({
        ...req.body,
        createdBy: "system"
      });
      res.json(mediaSegment);
    } catch (error) {
      console.error("Error creating media segment:", error);
      res.status(500).json({ message: "Failed to create media segment" });
    }
  });

  app.patch('/api/media-segments/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const mediaSegment = await storage.updateMediaSegment(id, req.body);
      res.json(mediaSegment);
    } catch (error) {
      console.error("Error updating media segment:", error);
      res.status(500).json({ message: "Failed to update media segment" });
    }
  });

  app.delete('/api/media-segments/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMediaSegment(id);
      res.json({ message: "Media segment deleted successfully" });
    } catch (error) {
      console.error("Error deleting media segment:", error);
      res.status(500).json({ message: "Failed to delete media segment" });
    }
  });

  // Segment mapping routes
  app.get('/api/segment-mappings/:chapterId', async (req, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const mappings = await storage.getSegmentMappingsByChapter(chapterId);
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching segment mappings:", error);
      res.status(500).json({ message: "Failed to fetch segment mappings" });
    }
  });

  app.post('/api/segment-mappings', async (req, res) => {
    try {
      const mapping = await storage.createSegmentMapping({
        ...req.body,
        createdBy: "system"
      });
      res.json(mapping);
    } catch (error) {
      console.error("Error creating segment mapping:", error);
      res.status(500).json({ message: "Failed to create segment mapping" });
    }
  });

  app.delete('/api/segment-mappings/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSegmentMapping(id);
      res.json({ message: "Segment mapping deleted successfully" });
    } catch (error) {
      console.error("Error deleting segment mapping:", error);
      res.status(500).json({ message: "Failed to delete segment mapping" });
    }
  });

  // Normalized mapping routes (using segment-mappings)
  
  app.get('/api/segment-mappings/audio/:audioFileId', async (req, res) => {
    try {
      const audioFileId = parseInt(req.params.audioFileId);
      const mappings = await storage.getSegmentMappingsByAudioFile(audioFileId);
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching segment mappings by audio:", error);
      res.status(500).json({ message: "Failed to fetch segment mappings" });
    }
  });

  app.post('/api/segment-mappings/with-media-segment', async (req, res) => {
    try {
      const mapping = await storage.createMappingWithMediaSegment({
        ...req.body,
        createdBy: "system"
      });
      res.json(mapping);
    } catch (error) {
      console.error("Error creating mapping with media segment:", error);
      res.status(500).json({ message: "Failed to create mapping" });
    }
  });

  app.delete('/api/segment-mappings/by-text-segment/:textSegmentId/:audioFileId', async (req, res) => {
    try {
      const textSegmentId = parseInt(req.params.textSegmentId);
      const audioFileId = parseInt(req.params.audioFileId);
      await storage.deleteSegmentMappingByTextSegment(textSegmentId, audioFileId);
      res.json({ message: "Segment mapping deleted successfully" });
    } catch (error) {
      console.error("Error deleting segment mapping:", error);
      res.status(500).json({ message: "Failed to delete segment mapping" });
    }
  });

  // Legacy compatibility routes (redirect to normalized system)
  app.get('/api/mappings/chapter/:chapterId', async (req, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const mappings = await storage.getSegmentMappingsByChapter(chapterId);
      const legacyFormat = mappings.map(m => ({
        id: m.mappingId,
        segmentId: m.textSegmentId,
        audioFileId: m.audioFileId,
        startTime: m.startTime,
        endTime: m.endTime
      }));
      res.json(legacyFormat);
    } catch (error) {
      console.error("Error fetching chapter mappings:", error);
      res.status(500).json({ message: "Failed to fetch chapter mappings" });
    }
  });

  app.get('/api/mappings/audio/:audioFileId', async (req, res) => {
    try {
      const audioFileId = parseInt(req.params.audioFileId);
      const mappings = await storage.getSegmentMappingsByAudioFile(audioFileId);
      const legacyFormat = mappings.map(m => ({
        id: m.mappingId,
        segmentId: m.textSegmentId,
        audioFileId: m.audioFileId,
        startTime: m.startTime,
        endTime: m.endTime
      }));
      res.json(legacyFormat);
    } catch (error) {
      console.error("Error fetching audio mappings:", error);
      res.status(500).json({ message: "Failed to fetch audio mappings" });
    }
  });

  app.get('/api/mappings/audio/:audioFileId/count', async (req, res) => {
    try {
      const audioFileId = parseInt(req.params.audioFileId);
      const mappings = await storage.getSegmentMappingsByAudioFile(audioFileId);
      res.json({ count: mappings.length });
    } catch (error) {
      console.error("Error fetching audio mappings count:", error);
      res.status(500).json({ message: "Failed to fetch audio mappings count" });
    }
  });

  app.post('/api/mappings', async (req, res) => {
    try {
      const { audioFileId, segmentId, startTime, endTime } = req.body;
      const mapping = await storage.createMappingWithMediaSegment({
        audioFileId,
        textSegmentId: segmentId,
        startTime,
        endTime,
        createdBy: "system"
      });
      res.json({
        id: mapping.mappingId,
        segmentId: mapping.textSegmentId,
        audioFileId: mapping.audioFileId,
        startTime: mapping.startTime,
        endTime: mapping.endTime
      });
    } catch (error) {
      console.error("Error creating audio mapping:", error);
      res.status(500).json({ message: "Failed to create audio mapping" });
    }
  });

  app.delete('/api/mappings/:audioFileId/:segmentId', async (req, res) => {
    try {
      const audioFileId = parseInt(req.params.audioFileId);
      const segmentId = parseInt(req.params.segmentId);
      await storage.deleteSegmentMappingByTextSegment(segmentId, audioFileId);
      res.json({ message: "Audio mapping deleted successfully" });
    } catch (error) {
      console.error("Error deleting audio mapping:", error);
      res.status(500).json({ message: "Failed to delete audio mapping" });
    }
  });

  const httpServer = createServer(app);
  // Add global error handling middleware at the end
  app.use(globalErrorHandler);

  return httpServer;
}