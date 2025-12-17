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
    fileSize: FILE_UPLOAD.maxSize,
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

  // NOTE: Track, Chapter, and Text Segment routes have been migrated to content.routes.ts (Phase 2)
  // See server/routes/content.routes.ts for all content-related endpoints

  

  

  // Chapter routes
  

  

  

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

  // Mapping routes - return MappingWithTimestamps format
  app.get('/api/mappings/chapter/:chapterId', async (req, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const mappings = await storage.getSegmentMappingsByChapter(chapterId);
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching chapter mappings:", error);
      res.status(500).json({ message: "Failed to fetch chapter mappings" });
    }
  });

  app.get('/api/mappings/audio/:audioFileId', async (req, res) => {
    try {
      const audioFileId = parseInt(req.params.audioFileId);
      const mappings = await storage.getSegmentMappingsByAudioFile(audioFileId);
      res.json(mappings);
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
      const { audioFileId, textSegmentId, startTime, endTime } = req.body;
      const mapping = await storage.createMappingWithMediaSegment({
        audioFileId,
        textSegmentId,
        startTime,
        endTime,
        createdBy: "system"
      });
      res.json(mapping);
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