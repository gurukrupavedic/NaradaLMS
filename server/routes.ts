import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertTrackSchema,
  insertChapterSchema,
  insertAudioFileSchema,
  insertSegmentSchema,
  insertAudioSegmentMappingSchema,
  insertStudentProgressSchema,
} from "@shared/schema";
import multer from "multer";
import path from "path";
import { z } from "zod";

// Configure multer for audio file uploads
const upload = multer({
  dest: "uploads/audio/",
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

// Helper function to check user roles
function hasRole(user: any, role: string): boolean {
  return user?.claims?.roles?.includes(role) || false;
}

function requireRole(role: string) {
  return (req: any, res: any, next: any) => {
    if (!hasRole(req.user, role)) {
      return res.status(403).json({ message: `Requires ${role} role` });
    }
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User management routes (Admin only)
  app.get('/api/users', isAuthenticated, requireRole('admin'), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/users/:id/roles', isAuthenticated, requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { roles } = req.body;
      
      if (!Array.isArray(roles)) {
        return res.status(400).json({ message: "Roles must be an array" });
      }

      const user = await storage.updateUserRoles(id, roles);
      res.json(user);
    } catch (error) {
      console.error("Error updating user roles:", error);
      res.status(500).json({ message: "Failed to update user roles" });
    }
  });

  app.patch('/api/users/:id/status', isAuthenticated, requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['active', 'disabled', 'pending'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const user = await storage.updateUserStatus(id, status);
      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Track routes
  app.get('/api/tracks', isAuthenticated, async (req, res) => {
    try {
      const tracks = await storage.getTracks();
      res.json(tracks);
    } catch (error) {
      console.error("Error fetching tracks:", error);
      res.status(500).json({ message: "Failed to fetch tracks" });
    }
  });

  app.get('/api/tracks/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const track = await storage.getTrack(id);
      
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }
      
      res.json(track);
    } catch (error) {
      console.error("Error fetching track:", error);
      res.status(500).json({ message: "Failed to fetch track" });
    }
  });

  app.post('/api/tracks', isAuthenticated, requireRole('content_manager'), async (req: any, res) => {
    try {
      const trackData = insertTrackSchema.parse({
        ...req.body,
        createdBy: req.user.claims.sub,
      });
      
      const track = await storage.createTrack(trackData);
      res.status(201).json(track);
    } catch (error) {
      console.error("Error creating track:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid track data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create track" });
    }
  });

  app.patch('/api/tracks/:id', isAuthenticated, requireRole('content_manager'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertTrackSchema.partial().parse(req.body);
      
      const track = await storage.updateTrack(id, updateData);
      res.json(track);
    } catch (error) {
      console.error("Error updating track:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid track data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update track" });
    }
  });

  app.delete('/api/tracks/:id', isAuthenticated, requireRole('content_manager'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTrack(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting track:", error);
      res.status(500).json({ message: "Failed to delete track" });
    }
  });

  // Chapter routes
  app.get('/api/chapters/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const chapter = await storage.getChapter(id);
      
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }
      
      res.json(chapter);
    } catch (error) {
      console.error("Error fetching chapter:", error);
      res.status(500).json({ message: "Failed to fetch chapter" });
    }
  });

  app.post('/api/tracks/:trackId/chapters', isAuthenticated, requireRole('content_manager'), async (req: any, res) => {
    try {
      const trackId = parseInt(req.params.trackId);
      const chapterData = insertChapterSchema.parse({
        ...req.body,
        trackId,
        createdBy: req.user.claims.sub,
      });
      
      const chapter = await storage.createChapter(chapterData);
      res.status(201).json(chapter);
    } catch (error) {
      console.error("Error creating chapter:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid chapter data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create chapter" });
    }
  });

  app.patch('/api/chapters/:id', isAuthenticated, requireRole('content_manager'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertChapterSchema.partial().parse(req.body);
      
      const chapter = await storage.updateChapter(id, updateData);
      res.json(chapter);
    } catch (error) {
      console.error("Error updating chapter:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid chapter data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update chapter" });
    }
  });

  app.delete('/api/chapters/:id', isAuthenticated, requireRole('content_manager'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteChapter(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting chapter:", error);
      res.status(500).json({ message: "Failed to delete chapter" });
    }
  });

  // Audio file routes
  app.post('/api/chapters/:chapterId/audio', 
    isAuthenticated, 
    requireRole('content_manager'),
    upload.single('audio'),
    async (req: any, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No audio file provided" });
        }

        const chapterId = parseInt(req.params.chapterId);
        const { reciter } = req.body;

        const audioFileData = insertAudioFileSchema.parse({
          chapterId,
          filename: req.file.filename,
          originalName: req.file.originalname,
          reciter: reciter || null,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          uploadedBy: req.user.claims.sub,
        });

        const audioFile = await storage.createAudioFile(audioFileData);
        res.status(201).json(audioFile);
      } catch (error) {
        console.error("Error uploading audio file:", error);
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: "Invalid audio file data", errors: error.errors });
        }
        res.status(500).json({ message: "Failed to upload audio file" });
      }
    }
  );

  app.delete('/api/audio/:id', isAuthenticated, requireRole('content_manager'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAudioFile(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting audio file:", error);
      res.status(500).json({ message: "Failed to delete audio file" });
    }
  });

  // Segment routes
  app.post('/api/chapters/:chapterId/segments', isAuthenticated, requireRole('content_manager'), async (req: any, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const segmentData = insertSegmentSchema.parse({
        ...req.body,
        chapterId,
        createdBy: req.user.claims.sub,
      });
      
      const segment = await storage.createSegment(segmentData);
      res.status(201).json(segment);
    } catch (error) {
      console.error("Error creating segment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid segment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create segment" });
    }
  });

  app.patch('/api/segments/:id', isAuthenticated, requireRole('content_manager'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertSegmentSchema.partial().parse(req.body);
      
      const segment = await storage.updateSegment(id, updateData);
      res.json(segment);
    } catch (error) {
      console.error("Error updating segment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid segment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update segment" });
    }
  });

  app.delete('/api/segments/:id', isAuthenticated, requireRole('content_manager'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMappingsBySegment(id);
      await storage.deleteSegment(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting segment:", error);
      res.status(500).json({ message: "Failed to delete segment" });
    }
  });

  // Audio-segment mapping routes
  app.post('/api/mappings', isAuthenticated, requireRole('content_manager'), async (req: any, res) => {
    try {
      const mappingData = insertAudioSegmentMappingSchema.parse({
        ...req.body,
        createdBy: req.user.claims.sub,
      });
      
      const mapping = await storage.createAudioSegmentMapping(mappingData);
      res.status(201).json(mapping);
    } catch (error) {
      console.error("Error creating mapping:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid mapping data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create mapping" });
    }
  });

  // Student progress routes
  app.get('/api/progress/students', isAuthenticated, requireRole('instructor'), async (req, res) => {
    try {
      const students = await storage.getStudentsWithProgress();
      res.json(students);
    } catch (error) {
      console.error("Error fetching student progress:", error);
      res.status(500).json({ message: "Failed to fetch student progress" });
    }
  });

  app.get('/api/progress/:studentId/:chapterId', isAuthenticated, async (req, res) => {
    try {
      const { studentId, chapterId } = req.params;
      const progress = await storage.getStudentProgress(studentId, parseInt(chapterId));
      
      if (!progress) {
        return res.status(404).json({ message: "Progress not found" });
      }
      
      res.json(progress);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.post('/api/progress', isAuthenticated, requireRole('instructor'), async (req: any, res) => {
    try {
      const progressData = insertStudentProgressSchema.parse({
        ...req.body,
        updatedBy: req.user.claims.sub,
      });
      
      const progress = await storage.upsertStudentProgress(progressData);
      res.status(201).json(progress);
    } catch (error) {
      console.error("Error updating progress:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid progress data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  app.post('/api/progress/bulk', isAuthenticated, requireRole('instructor'), async (req: any, res) => {
    try {
      const { progressUpdates } = req.body;
      
      if (!Array.isArray(progressUpdates)) {
        return res.status(400).json({ message: "Progress updates must be an array" });
      }

      const validatedUpdates = progressUpdates.map(update => 
        insertStudentProgressSchema.parse({
          ...update,
          updatedBy: req.user.claims.sub,
        })
      );
      
      await storage.bulkUpdateProgress(validatedUpdates);
      res.status(200).json({ message: "Progress updated successfully" });
    } catch (error) {
      console.error("Error bulk updating progress:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid progress data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // Serve audio files
  app.use('/api/audio-files', express.static(path.join(process.cwd(), 'uploads/audio')));

  const httpServer = createServer(app);
  return httpServer;
}
