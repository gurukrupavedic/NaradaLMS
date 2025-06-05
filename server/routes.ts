import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertTrackSchema, insertChapterSchema, insertTextSegmentSchema, insertAudioMappingSchema, insertStudentProgressSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for audio file uploads
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

// Helper function to check user roles
function hasRole(user: any, role: string): boolean {
  return user?.claims?.sub && user.roles?.includes(role);
}

// Middleware to check specific roles
function requireRole(role: string) {
  return async (req: any, res: any, next: any) => {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user || !user.roles || !user.roles.includes(role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    req.currentUser = user;
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Track routes (bypassing authentication for development)
  app.get('/api/tracks', async (req, res) => {
    try {
      const rawTracks = await storage.getAllTracks();
      
      // Transform tracks to match Dashboard component expectations
      const tracks = await Promise.all(rawTracks.map(async track => {
        const chapters = await storage.getChaptersByTrack(track.id);
        const completedChapters = 0; // Will implement with student progress later
        
        return {
          id: track.id,
          title: track.title,
          description: track.description,
          order: track.order || 1,
          status: 'not_started', // Will implement with student progress later
          chapterCount: chapters.length,
          completedChapters,
          currentLevel: 0, // Will implement with student progress later
          estimatedHours: track.estimatedHours || chapters.length * 2
        };
      }));
      
      res.json(tracks);
    } catch (error) {
      console.error("Error fetching tracks:", error);
      res.status(500).json({ message: "Failed to fetch tracks" });
    }
  });

  app.get('/api/tracks/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const track = await storage.getTrack(id);
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }
      
      // Debug logging
      console.log(`Track ${id} found:`, {
        title: track.title,
        chaptersCount: track.chapters?.length || 0,
        chapters: track.chapters?.map((ch: any) => ({ id: ch.id, title: ch.title })) || []
      });
      
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
      res.json(track);
    } catch (error) {
      console.error("Error creating track:", error);
      res.status(400).json({ message: "Failed to create track" });
    }
  });

  app.put('/api/tracks/:id', isAuthenticated, requireRole('content_manager'), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const trackData = insertTrackSchema.partial().parse(req.body);
      const track = await storage.updateTrack(id, trackData);
      res.json(track);
    } catch (error) {
      console.error("Error updating track:", error);
      res.status(400).json({ message: "Failed to update track" });
    }
  });

  app.delete('/api/tracks/:id', isAuthenticated, requireRole('content_manager'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTrack(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting track:", error);
      res.status(500).json({ message: "Failed to delete track" });
    }
  });

  // Chapter routes
  app.get('/api/tracks/:trackId/chapters', isAuthenticated, async (req, res) => {
    try {
      const trackId = parseInt(req.params.trackId);
      const chapters = await storage.getChaptersByTrack(trackId);
      res.json(chapters);
    } catch (error) {
      console.error("Error fetching chapters:", error);
      res.status(500).json({ message: "Failed to fetch chapters" });
    }
  });

  app.get('/api/chapters/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const chapter = await storage.getChapter(id);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      // Chapter already includes segments, audioFiles, and mappings from storage
      res.json(chapter);
    } catch (error) {
      console.error("Error fetching chapter:", error);
      res.status(500).json({ message: "Failed to fetch chapter" });
    }
  });

  app.post('/api/chapters', isAuthenticated, requireRole('content_manager'), async (req: any, res) => {
    try {
      const chapterData = insertChapterSchema.parse({
        ...req.body,
        createdBy: req.user.claims.sub,
      });
      const chapter = await storage.createChapter(chapterData);
      res.json(chapter);
    } catch (error) {
      console.error("Error creating chapter:", error);
      res.status(400).json({ message: "Failed to create chapter" });
    }
  });

  app.put('/api/chapters/:id', isAuthenticated, requireRole('content_manager'), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const chapterData = insertChapterSchema.partial().parse(req.body);
      const chapter = await storage.updateChapter(id, chapterData);
      res.json(chapter);
    } catch (error) {
      console.error("Error updating chapter:", error);
      res.status(400).json({ message: "Failed to update chapter" });
    }
  });

  // Audio file routes
  app.post('/api/chapters/:chapterId/audio', isAuthenticated, requireRole('content_manager'), upload.single('audio'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      const chapterId = parseInt(req.params.chapterId);
      const audioFile = await storage.createAudioFile({
        chapterId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        reciter: req.body.reciter || null,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: req.user.claims.sub,
      });

      res.json(audioFile);
    } catch (error) {
      console.error("Error uploading audio:", error);
      res.status(500).json({ message: "Failed to upload audio file" });
    }
  });

  app.delete('/api/audio/:id', isAuthenticated, requireRole('content_manager'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAudioFile(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting audio file:", error);
      res.status(500).json({ message: "Failed to delete audio file" });
    }
  });

  // Text segment routes
  app.post('/api/chapters/:chapterId/segments', isAuthenticated, requireRole('content_manager'), async (req: any, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const segmentData = insertTextSegmentSchema.parse({
        ...req.body,
        chapterId,
        createdBy: req.user.claims.sub,
      });
      const segment = await storage.createTextSegment(segmentData);
      res.json(segment);
    } catch (error) {
      console.error("Error creating segment:", error);
      res.status(400).json({ message: "Failed to create segment" });
    }
  });

  app.put('/api/segments/:id', isAuthenticated, requireRole('content_manager'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const segmentData = insertTextSegmentSchema.partial().parse(req.body);
      const segment = await storage.updateTextSegment(id, segmentData);
      res.json(segment);
    } catch (error) {
      console.error("Error updating segment:", error);
      res.status(400).json({ message: "Failed to update segment" });
    }
  });

  app.delete('/api/segments/:id', isAuthenticated, requireRole('content_manager'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTextSegment(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting segment:", error);
      res.status(500).json({ message: "Failed to delete segment" });
    }
  });

  // Audio mapping routes
  app.post('/api/audio-mappings', isAuthenticated, requireRole('content_manager'), async (req: any, res) => {
    try {
      const mappingData = insertAudioMappingSchema.parse({
        ...req.body,
        createdBy: req.user.claims.sub,
      });
      const mapping = await storage.createAudioMapping(mappingData);
      res.json(mapping);
    } catch (error) {
      console.error("Error creating audio mapping:", error);
      res.status(400).json({ message: "Failed to create audio mapping" });
    }
  });

  app.delete('/api/audio-mappings/:audioFileId/:segmentId', isAuthenticated, requireRole('content_manager'), async (req, res) => {
    try {
      const audioFileId = parseInt(req.params.audioFileId);
      const segmentId = parseInt(req.params.segmentId);
      await storage.deleteAudioMapping(audioFileId, segmentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting audio mapping:", error);
      res.status(500).json({ message: "Failed to delete audio mapping" });
    }
  });

  // Student progress routes
  app.get('/api/student-progress', isAuthenticated, requireRole('instructor'), async (req, res) => {
    try {
      const allProgress = await storage.getAllStudentProgress();
      res.json(allProgress);
    } catch (error) {
      console.error("Error fetching student progress:", error);
      res.status(500).json({ message: "Failed to fetch student progress" });
    }
  });

  app.get('/api/student-progress/:studentId', isAuthenticated, async (req: any, res) => {
    try {
      const studentId = req.params.studentId;
      const currentUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(currentUserId);

      // Students can only view their own progress, instructors can view any
      if (studentId !== currentUserId && !currentUser?.roles.includes('instructor')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const progress = await storage.getStudentProgress(studentId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching student progress:", error);
      res.status(500).json({ message: "Failed to fetch student progress" });
    }
  });

  app.put('/api/student-progress', isAuthenticated, requireRole('instructor'), async (req: any, res) => {
    try {
      const progressData = insertStudentProgressSchema.parse({
        ...req.body,
        updatedBy: req.user.claims.sub,
        lastAccessed: new Date(),
      });
      const progress = await storage.updateStudentProgress(progressData);
      res.json(progress);
    } catch (error) {
      console.error("Error updating student progress:", error);
      res.status(400).json({ message: "Failed to update student progress" });
    }
  });

  // Admin routes - removing role restrictions for development
  app.get('/api/admin/users', isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/admin/users/:userId/roles', isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.userId;
      const { roles } = req.body;
      
      if (!Array.isArray(roles)) {
        return res.status(400).json({ message: "Roles must be an array" });
      }

      const user = await storage.updateUserRoles(userId, roles);
      res.json(user);
    } catch (error) {
      console.error("Error updating user roles:", error);
      res.status(400).json({ message: "Failed to update user roles" });
    }
  });

  app.put('/api/admin/users/:userId/status', isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.userId;
      const { status } = req.body;
      
      if (!['active', 'disabled', 'pending'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const user = await storage.updateUserStatus(userId, status);
      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(400).json({ message: "Failed to update user status" });
    }
  });

  // Admin/Instructor content management routes
  app.get('/api/admin/tracks', async (req, res) => {
    try {
      const tracks = await storage.getAllTracks();
      res.json(tracks);
    } catch (error) {
      console.error("Error fetching admin tracks:", error);
      res.status(500).json({ message: "Failed to fetch tracks" });
    }
  });

  app.post('/api/admin/tracks', async (req, res) => {
    try {
      console.log("Track creation request body:", req.body);
      const trackData = insertTrackSchema.parse(req.body);
      console.log("Parsed track data:", trackData);
      
      // Get the next sequential order number
      const existingTracks = await storage.getAllTracks();
      const nextOrder = existingTracks.length + 1;
      
      const track = await storage.createTrack({
        ...trackData,
        order: nextOrder,
        createdBy: "system"
      });
      console.log("Created track:", track);
      res.json(track);
    } catch (error) {
      console.error("Error creating track:", error);
      res.status(500).json({ message: "Failed to create track", error: error.message });
    }
  });

  // Update track
  app.put('/api/admin/tracks/:id', async (req, res) => {
    try {
      const trackId = parseInt(req.params.id);
      const trackData = insertTrackSchema.parse(req.body);
      
      const track = await storage.updateTrack(trackId, trackData);
      res.json(track);
    } catch (error) {
      console.error("Error updating track:", error);
      res.status(500).json({ message: "Failed to update track" });
    }
  });

  // Delete track
  app.delete('/api/admin/tracks/:id', async (req, res) => {
    try {
      const trackId = parseInt(req.params.id);
      await storage.deleteTrack(trackId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting track:", error);
      res.status(500).json({ message: "Failed to delete track" });
    }
  });

  app.get('/api/admin/chapters/:trackId', async (req, res) => {
    try {
      const trackId = parseInt(req.params.trackId);
      const chapters = await storage.getChaptersByTrack(trackId);
      res.json(chapters);
    } catch (error) {
      console.error("Error fetching chapters:", error);
      res.status(500).json({ message: "Failed to fetch chapters" });
    }
  });

  app.post('/api/admin/chapters', async (req, res) => {
    try {
      const chapterData = insertChapterSchema.parse(req.body);
      const chapter = await storage.createChapter({
        ...chapterData,
        createdBy: "system"
      });
      res.json(chapter);
    } catch (error) {
      console.error("Error creating chapter:", error);
      res.status(500).json({ message: "Failed to create chapter" });
    }
  });

  app.get('/api/admin/segments/:chapterId', async (req, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const segments = await storage.getSegmentsByChapter(chapterId);
      res.json(segments);
    } catch (error) {
      console.error("Error fetching segments:", error);
      res.status(500).json({ message: "Failed to fetch segments" });
    }
  });

  app.post('/api/admin/segments', async (req, res) => {
    try {
      const segmentData = insertTextSegmentSchema.parse(req.body);
      const segment = await storage.createTextSegment({
        ...segmentData,
        createdBy: "system"
      });
      res.json(segment);
    } catch (error) {
      console.error("Error creating segment:", error);
      res.status(500).json({ message: "Failed to create segment" });
    }
  });

  app.get('/api/admin/audio-files/:chapterId', async (req, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const audioFiles = await storage.getAudioFilesByChapter(chapterId);
      res.json(audioFiles);
    } catch (error) {
      console.error("Error fetching audio files:", error);
      res.status(500).json({ message: "Failed to fetch audio files" });
    }
  });

  // Serve uploaded audio files
  app.get('/api/audio-files/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "Audio file not found" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
