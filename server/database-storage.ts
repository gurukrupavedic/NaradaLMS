import { db } from "./db";
import { 
  tracks, chapters, audioFiles, textSegments, mediaSegments, segmentMappings, audioMappings, users
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { MemStorage } from "./storage-simplified";
const memStorage = new MemStorage();

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<any>;
  upsertUser(user: any): Promise<any>;
  getAllUsers(): Promise<any[]>;
  updateUserRoles(userId: string, roles: string[]): Promise<any>;
  updateUserStatus(userId: string, status: string): Promise<any>;
  
  // Track operations
  getAllTracks(): Promise<any[]>;
  getTrack(id: number): Promise<any | undefined>;
  createTrack(track: any): Promise<any>;
  updateTrack(id: number, track: any): Promise<any>;
  deleteTrack(id: number): Promise<void>;

  // Chapter operations
  getChaptersByTrack(trackId: number): Promise<any[]>;
  getChapter(id: number): Promise<any | undefined>;
  createChapter(chapter: any): Promise<any>;
  updateChapter(id: number, chapter: any): Promise<any>;
  deleteChapter(id: number): Promise<void>;

  // Audio file operations
  getAudioFilesByChapter(chapterId: number): Promise<any[]>;
  createAudioFile(audioFile: any): Promise<any>;
  updateAudioFile(id: number, audioFile: any): Promise<any>;
  deleteAudioFile(id: number): Promise<void>;

  // Text segment operations
  getSegmentsByChapter(chapterId: number): Promise<any[]>;
  createTextSegment(segment: any): Promise<any>;
  updateTextSegment(id: number, segment: any): Promise<any>;
  deleteTextSegment(id: number): Promise<void>;

  // Media segment operations
  getMediaSegmentsByAudioFile(audioFileId: number): Promise<any[]>;
  createMediaSegment(segment: any): Promise<any>;
  updateMediaSegment(id: number, segment: any): Promise<any>;
  deleteMediaSegment(id: number): Promise<void>;

  // Segment mapping operations
  getSegmentMappingsByChapter(chapterId: number): Promise<any[]>;
  createSegmentMapping(mapping: any): Promise<any>;
  deleteSegmentMapping(id: number): Promise<void>;

  // Audio mapping operations (legacy)
  getMappingsByAudioFile(audioFileId: number): Promise<any[]>;
  getMappingsBySegment(segmentId: number): Promise<any[]>;
  createAudioMapping(mapping: any): Promise<any>;
  deleteAudioMapping(audioFileId: number, segmentId: number): Promise<void>;

  // Student progress
  getStudentProgress(studentId: string): Promise<any[]>;
  getStudentStats(studentId: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  private initialized = false;

  async ensureInitialized() {
    if (this.initialized) return;
    
    try {
      // Check if data exists
      const existingTracks = await db.select().from(tracks).limit(1);
      
      if (existingTracks.length === 0) {
        console.log("Initializing database with seed data...");
        await this.seedDatabase();
      }
      
      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize database:", error);
      // Fall back to memory storage if database fails
      this.initialized = false;
    }
  }

  private async seedDatabase() {
    // Seed tracks
    const seedTracks = [
      {
        title: "Vaidika Nithya Karma",
        description: "Essential daily Vedic practices and rituals for spiritual development",
        order: 1,
        status: "published" as const,
        estimatedHours: 120,
        createdBy: "system",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Sookta Paatham",
        description: "Sacred hymns and verses for devotional practice and spiritual elevation",
        order: 2,
        status: "published" as const,
        estimatedHours: 100,
        createdBy: "system",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const insertedTracks = await db.insert(tracks).values(seedTracks).returning();

    // Seed chapters
    const seedChapters = [
      {
        trackId: insertedTracks[0].id,
        title: "vedādhyayana niyamamulu, veda svaraṁ, pañcāṅgaṁ, saṅkalpaṁ, yajñopavīta dhāraṇaṁ, avapośanaṁ",
        order: 1,
        status: "published" as const,
        createdBy: "system",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        trackId: insertedTracks[0].id,
        title: "Śraddhā sūktaṁ",
        order: 2,
        status: "published" as const,
        content: {
          te: "శ్రద్ధా సూక్తం",
          hi: "श्रद्धा सूक्त",
          en: "Shraddha Suktam"
        },
        createdBy: "system",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await db.insert(chapters).values(seedChapters);
    console.log("Database seeded successfully");
  }

  // User operations
  async getUser(id: string): Promise<any> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.getUser(id);
    
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      return memStorage.getUser(id);
    }
  }

  async upsertUser(userData: any): Promise<any> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.upsertUser(userData);
    
    try {
      const [user] = await db
        .insert(users)
        .values({
          ...userData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            username: userData.username,
            displayName: userData.displayName,
            email: userData.email,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date()
          }
        })
        .returning();
      return user;
    } catch (error) {
      return memStorage.upsertUser(userData);
    }
  }

  async getAllUsers(): Promise<any[]> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.getAllUsers();
    
    try {
      return await db.select().from(users);
    } catch (error) {
      return memStorage.getAllUsers();
    }
  }

  async updateUserRoles(userId: string, roles: string[]): Promise<any> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.updateUserRoles(userId, roles);
    
    try {
      const [user] = await db
        .update(users)
        .set({ roles, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
      return user;
    } catch (error) {
      return memStorage.updateUserRoles(userId, roles);
    }
  }

  async updateUserStatus(userId: string, status: string): Promise<any> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.updateUserStatus(userId, status);
    
    try {
      const [user] = await db
        .update(users)
        .set({ status, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
      return user;
    } catch (error) {
      return memStorage.updateUserStatus(userId, status);
    }
  }

  // Track operations
  async getAllTracks(): Promise<any[]> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.getAllTracks();
    
    try {
      return await db.select().from(tracks).orderBy(tracks.order);
    } catch (error) {
      return memStorage.getAllTracks();
    }
  }

  async getTrack(id: number): Promise<any | undefined> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.getTrack(id);
    
    try {
      const [track] = await db.select().from(tracks).where(eq(tracks.id, id));
      return track;
    } catch (error) {
      return memStorage.getTrack(id);
    }
  }

  async createTrack(track: any): Promise<any> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.createTrack(track);
    
    try {
      const [newTrack] = await db.insert(tracks).values({
        ...track,
        order: 1,
        createdBy: "system",
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      return newTrack;
    } catch (error) {
      return memStorage.createTrack(track);
    }
  }

  async updateTrack(id: number, trackUpdate: any): Promise<any> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.updateTrack(id, trackUpdate);
    
    try {
      const [track] = await db
        .update(tracks)
        .set({ ...trackUpdate, updatedAt: new Date() })
        .where(eq(tracks.id, id))
        .returning();
      return track;
    } catch (error) {
      return memStorage.updateTrack(id, trackUpdate);
    }
  }

  async deleteTrack(id: number): Promise<void> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.deleteTrack(id);
    
    try {
      await db.delete(tracks).where(eq(tracks.id, id));
    } catch (error) {
      return memStorage.deleteTrack(id);
    }
  }

  // Chapter operations
  async getChaptersByTrack(trackId: number): Promise<any[]> {
    await this.ensureInitialized();
    if (!this.initialized) {
      return memStorage.getChaptersByTrack(trackId);
    }
    
    try {
      // Get base chapters
      const chapterList = await db.select().from(chapters).where(eq(chapters.trackId, trackId)).orderBy(chapters.order);
      
      // Enrich each chapter with counts
      const enrichedChapters = await Promise.all(chapterList.map(async (chapter) => {
        try {
          // Check if content exists (any language has content)
          const hasContent = Boolean(
            (chapter.content?.te && chapter.content.te.trim().length > 0) ||
            (chapter.content?.hi && chapter.content.hi.trim().length > 0) ||
            (chapter.content?.en && chapter.content.en.trim().length > 0)
          );
          
          // Count audio files
          const audioFilesList = await db.select().from(audioFiles).where(eq(audioFiles.chapterId, chapter.id));
          const audioFileCount = audioFilesList.length;
          
          // Count media segments across all audio files for this chapter
          let segmentCount = 0;
          for (const audioFile of audioFilesList) {
            const mediaSegmentsList = await db.select().from(mediaSegments).where(eq(mediaSegments.audioFileId, audioFile.id));
            segmentCount += mediaSegmentsList.length;
            console.log(`Chapter ${chapter.id}, Audio File ${audioFile.id}: ${mediaSegmentsList.length} segments`);
          }
          console.log(`Chapter ${chapter.id} total segments: ${segmentCount}`);
          
          return {
            ...chapter,
            hasContent,
            audioFileCount,
            segmentCount
          };
        } catch (chapterError) {
          console.error(`Error enriching chapter ${chapter.id}:`, chapterError);
          return {
            ...chapter,
            hasContent: false,
            audioFileCount: 0,
            segmentCount: 0
          };
        }
      }));
      
      return enrichedChapters;
    } catch (error) {
      console.error('Error fetching enriched chapters:', error);
      return memStorage.getChaptersByTrack(trackId);
    }
  }

  async getChapter(id: number): Promise<any | undefined> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.getChapter(id);
    
    try {
      const [chapter] = await db.select().from(chapters).where(eq(chapters.id, id));
      return chapter;
    } catch (error) {
      return memStorage.getChapter(id);
    }
  }

  async createChapter(chapter: any): Promise<any> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.createChapter(chapter);
    
    try {
      const [newChapter] = await db.insert(chapters).values({
        ...chapter,
        order: 1,
        createdBy: "system",
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      return newChapter;
    } catch (error) {
      return memStorage.createChapter(chapter);
    }
  }

  async updateChapter(id: number, chapterUpdate: any): Promise<any> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.updateChapter(id, chapterUpdate);
    
    try {
      const [chapter] = await db
        .update(chapters)
        .set({ ...chapterUpdate, updatedAt: new Date() })
        .where(eq(chapters.id, id))
        .returning();
      return chapter;
    } catch (error) {
      return memStorage.updateChapter(id, chapterUpdate);
    }
  }

  async deleteChapter(id: number): Promise<void> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.deleteChapter(id);
    
    try {
      await db.delete(chapters).where(eq(chapters.id, id));
    } catch (error) {
      return memStorage.deleteChapter(id);
    }
  }

  // Audio file operations
  async getAudioFilesByChapter(chapterId: number): Promise<any[]> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.getAudioFilesByChapter(chapterId);
    
    try {
      return await db.select().from(audioFiles).where(eq(audioFiles.chapterId, chapterId));
    } catch (error) {
      return memStorage.getAudioFilesByChapter(chapterId);
    }
  }

  async createAudioFile(audioFile: any): Promise<any> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.createAudioFile(audioFile);
    
    try {
      const [newAudioFile] = await db.insert(audioFiles).values({
        ...audioFile,
        createdAt: new Date()
      }).returning();
      return newAudioFile;
    } catch (error) {
      return memStorage.createAudioFile(audioFile);
    }
  }

  async updateAudioFile(id: number, audioFileUpdate: any): Promise<any> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.updateAudioFile(id, audioFileUpdate);
    
    try {
      const [audioFile] = await db
        .update(audioFiles)
        .set(audioFileUpdate)
        .where(eq(audioFiles.id, id))
        .returning();
      return audioFile;
    } catch (error) {
      return memStorage.updateAudioFile(id, audioFileUpdate);
    }
  }

  async deleteAudioFile(id: number): Promise<void> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.deleteAudioFile(id);
    
    try {
      await db.delete(audioFiles).where(eq(audioFiles.id, id));
    } catch (error) {
      return memStorage.deleteAudioFile(id);
    }
  }

  // Text segment operations
  async getSegmentsByChapter(chapterId: number): Promise<any[]> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.getSegmentsByChapter(chapterId);
    
    try {
      return await db.select().from(textSegments).where(eq(textSegments.chapterId, chapterId));
    } catch (error) {
      return memStorage.getSegmentsByChapter(chapterId);
    }
  }

  async createTextSegment(segment: any): Promise<any> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.createTextSegment(segment);
    
    try {
      const [newSegment] = await db.insert(textSegments).values({
        ...segment,
        createdAt: new Date()
      }).returning();
      return newSegment;
    } catch (error) {
      return memStorage.createTextSegment(segment);
    }
  }

  async updateTextSegment(id: number, segmentUpdate: any): Promise<any> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.updateTextSegment(id, segmentUpdate);
    
    try {
      const [segment] = await db
        .update(textSegments)
        .set(segmentUpdate)
        .where(eq(textSegments.id, id))
        .returning();
      return segment;
    } catch (error) {
      return memStorage.updateTextSegment(id, segmentUpdate);
    }
  }

  async deleteTextSegment(id: number): Promise<void> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.deleteTextSegment(id);
    
    try {
      await db.delete(textSegments).where(eq(textSegments.id, id));
    } catch (error) {
      return memStorage.deleteTextSegment(id);
    }
  }

  // Audio mapping operations
  async getMappingsByAudioFile(audioFileId: number): Promise<any[]> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.getMappingsByAudioFile(audioFileId);
    
    try {
      return await db.select().from(audioMappings).where(eq(audioMappings.audioFileId, audioFileId));
    } catch (error) {
      return memStorage.getMappingsByAudioFile(audioFileId);
    }
  }

  async getMappingsBySegment(segmentId: number): Promise<any[]> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.getMappingsBySegment(segmentId);
    
    try {
      return await db.select().from(audioMappings).where(eq(audioMappings.segmentId, segmentId));
    } catch (error) {
      return memStorage.getMappingsBySegment(segmentId);
    }
  }

  async createAudioMapping(mapping: any): Promise<any> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.createAudioMapping(mapping);
    
    try {
      const [newMapping] = await db.insert(audioMappings).values({
        ...mapping,
        createdAt: new Date()
      }).returning();
      return newMapping;
    } catch (error) {
      return memStorage.createAudioMapping(mapping);
    }
  }

  async deleteAudioMapping(audioFileId: number, segmentId: number): Promise<void> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.deleteAudioMapping(audioFileId, segmentId);
    
    try {
      await db.delete(audioMappings)
        .where(and(
          eq(audioMappings.audioFileId, audioFileId),
          eq(audioMappings.segmentId, segmentId)
        ));
    } catch (error) {
      return memStorage.deleteAudioMapping(audioFileId, segmentId);
    }
  }

  // Media segment operations
  async getMediaSegmentsByAudioFile(audioFileId: number): Promise<any[]> {
    await this.ensureInitialized();
    if (!this.initialized) return [];
    
    try {
      const segments = await db.select()
        .from(mediaSegments)
        .where(eq(mediaSegments.audioFileId, audioFileId))
        .orderBy(mediaSegments.startTimestamp);
      return segments;
    } catch (error) {
      console.error("Error fetching media segments:", error);
      return [];
    }
  }

  async createMediaSegment(segment: any): Promise<any> {
    await this.ensureInitialized();
    if (!this.initialized) return null;
    
    try {
      const [newSegment] = await db.insert(mediaSegments).values({
        ...segment,
        createdAt: new Date()
      }).returning();
      return newSegment;
    } catch (error) {
      console.error("Error creating media segment:", error);
      return null;
    }
  }

  async updateMediaSegment(id: number, segmentUpdate: any): Promise<any> {
    await this.ensureInitialized();
    if (!this.initialized) return null;
    
    try {
      const [updatedSegment] = await db.update(mediaSegments)
        .set(segmentUpdate)
        .where(eq(mediaSegments.id, id))
        .returning();
      return updatedSegment;
    } catch (error) {
      console.error("Error updating media segment:", error);
      return null;
    }
  }

  async deleteMediaSegment(id: number): Promise<void> {
    await this.ensureInitialized();
    if (!this.initialized) return;
    
    try {
      await db.delete(mediaSegments)
        .where(eq(mediaSegments.id, id));
    } catch (error) {
      console.error("Error deleting media segment:", error);
    }
  }

  // Segment mapping operations
  async getSegmentMappingsByChapter(chapterId: number): Promise<any[]> {
    await this.ensureInitialized();
    if (!this.initialized) return [];
    
    try {
      const mappings = await db.select({
        id: segmentMappings.id,
        mediaSegmentId: segmentMappings.mediaSegmentId,
        textSegmentId: segmentMappings.textSegmentId,
        createdBy: segmentMappings.createdBy,
        createdAt: segmentMappings.createdAt,
        mediaSegment: {
          id: mediaSegments.id,
          audioFileId: mediaSegments.audioFileId,
          startTimestamp: mediaSegments.startTimestamp,
          endTimestamp: mediaSegments.endTimestamp,
          segmentName: mediaSegments.segmentName
        },
        textSegment: {
          id: textSegments.id,
          conceptualName: textSegments.conceptualName,
          textReferences: textSegments.textReferences
        }
      })
      .from(segmentMappings)
      .leftJoin(mediaSegments, eq(segmentMappings.mediaSegmentId, mediaSegments.id))
      .leftJoin(textSegments, eq(segmentMappings.textSegmentId, textSegments.id))
      .where(eq(textSegments.chapterId, chapterId));
      
      return mappings;
    } catch (error) {
      console.error("Error fetching segment mappings:", error);
      return [];
    }
  }

  async createSegmentMapping(mapping: any): Promise<any> {
    await this.ensureInitialized();
    if (!this.initialized) return null;
    
    try {
      const [newMapping] = await db.insert(segmentMappings).values({
        ...mapping,
        createdAt: new Date()
      }).returning();
      return newMapping;
    } catch (error) {
      console.error("Error creating segment mapping:", error);
      return null;
    }
  }

  async deleteSegmentMapping(id: number): Promise<void> {
    await this.ensureInitialized();
    if (!this.initialized) return;
    
    try {
      await db.delete(segmentMappings)
        .where(eq(segmentMappings.id, id));
    } catch (error) {
      console.error("Error deleting segment mapping:", error);
    }
  }

  // Student progress
  async getStudentProgress(studentId: string): Promise<any[]> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.getStudentProgress(studentId);
    
    return [];
  }

  async getStudentStats(studentId: string): Promise<any> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.getStudentStats(studentId);
    
    return {
      totalStudyTime: 0,
      chaptersCompleted: 0,
      currentStreak: 0,
      highestLevel: 1
    };
  }
}

export const storage = new DatabaseStorage();