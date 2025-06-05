import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-authentic";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Skip auth setup for development
  // await setupAuth(app);

  // Mock auth routes for development
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Student learning routes
  app.get('/api/tracks', async (req, res) => {
    try {
      const rawTracks = await storage.getAllTracks();
      
      // Transform tracks to match Dashboard component expectations
      const tracks = rawTracks.map(track => {
        const chapters = track.chapters || [];
        const completedChapters = chapters.filter((ch: any) => ch.proficiencyLevel >= 4).length;
        
        return {
          id: track.id,
          title: track.title,
          description: track.description,
          order: track.order || 1,
          status: completedChapters === chapters.length && chapters.length > 0 ? 'completed' : 
                  completedChapters > 0 ? 'in_progress' : 'not_started',
          chapterCount: chapters.length,
          completedChapters,
          currentLevel: Math.max(0, ...chapters.map((ch: any) => ch.proficiencyLevel || 0)),
          estimatedHours: track.estimatedHours || chapters.length * 2
        };
      });
      
      res.json(tracks);
    } catch (error) {
      console.error("Error fetching tracks:", error);
      res.status(500).json({ message: "Failed to fetch tracks" });
    }
  });

  app.get('/api/tracks/:id', async (req, res) => {
    try {
      const { id } = req.params;
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

  app.get('/api/chapters/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
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

  app.get('/api/student-progress/:chapterId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { chapterId } = req.params;
      const progress = await storage.getStudentProgress(userId);
      const chapterProgress = progress.find(p => p.chapterId === chapterId);
      res.json(chapterProgress || { proficiencyLevel: 0 });
    } catch (error) {
      console.error("Error fetching student progress:", error);
      res.status(500).json({ message: "Failed to fetch student progress" });
    }
  });

  app.get('/api/student-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getStudentStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching student stats:", error);
      res.status(500).json({ message: "Failed to fetch student stats" });
    }
  });

  // Admin routes
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/admin/users/:userId/roles', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { roles } = req.body;
      const user = await storage.updateUserRoles(userId, roles);
      res.json(user);
    } catch (error) {
      console.error("Error updating user roles:", error);
      res.status(500).json({ message: "Failed to update user roles" });
    }
  });

  app.put('/api/admin/users/:userId/status', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { status } = req.body;
      const user = await storage.updateUserStatus(userId, status);
      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}