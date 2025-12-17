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
  

  

  

  

  

  

  

  const httpServer = createServer(app);
  // Add global error handling middleware at the end
  app.use(globalErrorHandler);

  return httpServer;
}