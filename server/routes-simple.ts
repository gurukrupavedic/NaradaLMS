import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-simplified";
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Static file serving for uploaded audio files
  app.use('/uploads', express.static(uploadsDir));

  // Track routes
  app.get('/api/tracks', async (req, res) => {
    try {
      const tracks = await storage.getAllTracks();
      res.json(tracks);
    } catch (error) {
      console.error("Error fetching tracks:", error);
      res.status(500).json({ message: "Failed to fetch tracks" });
    }
  });

  app.get('/api/admin/tracks', async (req, res) => {
    try {
      const tracks = await storage.getAllTracks();
      res.json(tracks);
    } catch (error) {
      console.error("Error fetching tracks:", error);
      res.status(500).json({ message: "Failed to fetch tracks" });
    }
  });

  app.get('/api/admin/tracks/:id', async (req, res) => {
    try {
      const track = await storage.getTrack(parseInt(req.params.id));
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }
      res.json(track);
    } catch (error) {
      console.error("Error fetching track:", error);
      res.status(500).json({ message: "Failed to fetch track" });
    }
  });

  // Chapter routes
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

  app.get('/api/admin/chapters/:chapterId/details', async (req, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const chapter = await storage.getChapter(chapterId);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }
      res.json(chapter);
    } catch (error) {
      console.error("Error fetching chapter:", error);
      res.status(500).json({ message: "Failed to fetch chapter" });
    }
  });

  app.post('/api/admin/tracks', async (req, res) => {
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

  app.post('/api/admin/chapters', async (req, res) => {
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

  app.patch('/api/admin/chapters/:chapterId', async (req, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const chapter = await storage.updateChapter(chapterId, req.body);
      res.json(chapter);
    } catch (error) {
      console.error("Error updating chapter:", error);
      res.status(500).json({ message: "Failed to update chapter" });
    }
  });

  // Audio file routes
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

  app.post('/api/admin/audio-files/:chapterId/upload', upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      const chapterId = parseInt(req.params.chapterId);
      
      // Parse audio metadata
      let duration = 0;
      try {
        const metadata = await parseFile(req.file.path);
        duration = metadata.format.duration || 0;
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
      console.error("Error uploading audio file:", error);
      res.status(500).json({ message: "Failed to upload audio file" });
    }
  });

  app.patch('/api/admin/audio-files/:audioFileId', async (req, res) => {
    try {
      const audioFileId = parseInt(req.params.audioFileId);
      const audioFile = await storage.updateAudioFile(audioFileId, req.body);
      res.json(audioFile);
    } catch (error) {
      console.error("Error updating audio file:", error);
      res.status(500).json({ message: "Failed to update audio file" });
    }
  });

  app.delete('/api/admin/audio-files/:audioFileId', async (req, res) => {
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
      const { chapterId, conceptualName, textReferences } = req.body;
      const segment = await storage.createTextSegment({
        chapterId,
        conceptualName,
        textReferences: textReferences || {},
        createdBy: "system"
      });
      
      res.json(segment);
    } catch (error) {
      console.error("Error creating segment:", error);
      res.status(500).json({ message: "Failed to create segment" });
    }
  });

  app.patch('/api/admin/segments/:segmentId', async (req, res) => {
    try {
      const segmentId = parseInt(req.params.segmentId);
      const segment = await storage.updateTextSegment(segmentId, req.body);
      res.json(segment);
    } catch (error) {
      console.error("Error updating segment:", error);
      res.status(500).json({ message: "Failed to update segment" });
    }
  });

  app.delete('/api/admin/segments/:segmentId', async (req, res) => {
    try {
      const segmentId = parseInt(req.params.segmentId);
      await storage.deleteTextSegment(segmentId);
      res.json({ message: "Segment deleted successfully" });
    } catch (error) {
      console.error("Error deleting segment:", error);
      res.status(500).json({ message: "Failed to delete segment" });
    }
  });

  // Audio mapping routes
  app.get('/api/admin/mappings/audio/:audioFileId', async (req, res) => {
    try {
      const audioFileId = parseInt(req.params.audioFileId);
      const mappings = await storage.getMappingsByAudioFile(audioFileId);
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching audio mappings:", error);
      res.status(500).json({ message: "Failed to fetch audio mappings" });
    }
  });

  app.get('/api/admin/mappings/segment/:segmentId', async (req, res) => {
    try {
      const segmentId = parseInt(req.params.segmentId);
      const mappings = await storage.getMappingsBySegment(segmentId);
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching segment mappings:", error);
      res.status(500).json({ message: "Failed to fetch segment mappings" });
    }
  });

  app.post('/api/admin/mappings', async (req, res) => {
    try {
      const mapping = await storage.createAudioMapping(req.body);
      res.json(mapping);
    } catch (error) {
      console.error("Error creating audio mapping:", error);
      res.status(500).json({ message: "Failed to create audio mapping" });
    }
  });

  app.delete('/api/admin/mappings/:audioFileId/:segmentId', async (req, res) => {
    try {
      const audioFileId = parseInt(req.params.audioFileId);
      const segmentId = parseInt(req.params.segmentId);
      await storage.deleteAudioMapping(audioFileId, segmentId);
      res.json({ message: "Audio mapping deleted successfully" });
    } catch (error) {
      console.error("Error deleting audio mapping:", error);
      res.status(500).json({ message: "Failed to delete audio mapping" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}