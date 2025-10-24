import { db } from "./db";
import { 
  tracks, chapters, audioFiles, textSegments, mediaSegments, segmentMappings, audioMappings, users
} from "@shared/schema";
import { eq, and, max } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { MemStorage } from "./storage-simplified";
const memStorage = new MemStorage();

export interface IStorage {
  // User operations (required for Replit Auth)
  /**
   * Retrieve user by ID
   * @param id - User identifier
   * @returns Promise resolving to user object or null
   */
  getUser(id: string): Promise<any>;
  
  /**
   * Create or update user record
   * @param user - User data object
   * @returns Promise resolving to updated user
   */
  upsertUser(user: any): Promise<any>;
  
  /**
   * Get all users in the system
   * @returns Promise resolving to array of user objects
   */
  getAllUsers(): Promise<any[]>;
  
  /**
   * Update user role assignments
   * @param userId - User identifier
   * @param roles - Array of role strings
   * @returns Promise resolving to updated user
   */
  updateUserRoles(userId: string, roles: string[]): Promise<any>;
  
  /**
   * Update user status (active, inactive, etc.)
   * @param userId - User identifier  
   * @param status - New status string
   * @returns Promise resolving to updated user
   */
  updateUserStatus(userId: string, status: string): Promise<any>;
  
  // Track operations
  /**
   * Retrieve all tracks ordered by sequence
   * @returns Promise resolving to array of track objects
   */
  getAllTracks(): Promise<any[]>;
  
  /**
   * Get specific track by ID
   * @param id - Track identifier
   * @returns Promise resolving to track or undefined if not found
   */
  getTrack(id: number): Promise<any | undefined>;
  
  /**
   * Create new learning track
   * @param track - Track data object
   * @returns Promise resolving to created track
   */
  createTrack(track: any): Promise<any>;
  
  /**
   * Update existing track
   * @param id - Track identifier
   * @param track - Updated track data
   * @returns Promise resolving to updated track
   */
  updateTrack(id: number, track: any): Promise<any>;
  
  /**
   * Delete track and associated content
   * @param id - Track identifier
   * @returns Promise resolving when deletion complete
   */
  deleteTrack(id: number): Promise<void>;

  // Chapter operations
  /**
   * Get all chapters for a specific track
   * @param trackId - Track identifier
   * @returns Promise resolving to array of chapter objects
   */
  getChaptersByTrack(trackId: number): Promise<any[]>;
  
  /**
   * Get specific chapter by ID
   * @param id - Chapter identifier
   * @returns Promise resolving to chapter or undefined if not found
   */
  getChapter(id: number): Promise<any | undefined>;
  
  /**
   * Create new chapter in a track
   * @param chapter - Chapter data object
   * @returns Promise resolving to created chapter
   */
  createChapter(chapter: any): Promise<any>;
  
  /**
   * Update existing chapter content
   * @param id - Chapter identifier
   * @param chapter - Updated chapter data
   * @returns Promise resolving to updated chapter
   */
  updateChapter(id: number, chapter: any): Promise<any>;
  
  /**
   * Delete chapter and associated content
   * @param id - Chapter identifier
   * @returns Promise resolving when deletion complete
   */
  deleteChapter(id: number): Promise<void>;

  // Audio file operations
  /**
   * Get all audio files for a specific chapter
   * @param chapterId - Chapter identifier
   * @returns Promise resolving to array of audio file objects
   */
  getAudioFilesByChapter(chapterId: number): Promise<any[]>;
  
  /**
   * Create new audio file record
   * @param audioFile - Audio file data object
   * @returns Promise resolving to created audio file
   */
  createAudioFile(audioFile: any): Promise<any>;
  
  /**
   * Update audio file metadata
   * @param id - Audio file identifier
   * @param audioFile - Updated audio file data
   * @returns Promise resolving to updated audio file
   */
  updateAudioFile(id: number, audioFile: any): Promise<any>;
  
  /**
   * Delete audio file and associated mappings
   * @param id - Audio file identifier
   * @returns Promise resolving when deletion complete
   */
  deleteAudioFile(id: number): Promise<void>;

  // Text segment operations
  getSegmentsByChapter(chapterId: number): Promise<any[]>;
  createTextSegment(segment: any): Promise<any>;
  updateTextSegment(id: number, segment: any): Promise<any>;
  updateSegmentOrder(chapterId: number, segmentOrders: { id: number; order: number }[]): Promise<void>;
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
      // Get all tracks first
      const allTracks = await db.select().from(tracks).orderBy(tracks.order);
      
      // For each track, count its chapters
      const tracksWithCounts = await Promise.all(
        allTracks.map(async (track) => {
          const chapterCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(chapters)
            .where(eq(chapters.trackId, track.id));
          
          return {
            ...track,
            chapterCount: Number(chapterCount[0]?.count || 0)
          };
        })
      );
      
      return tracksWithCounts;
    } catch (error) {
      console.error("Error fetching tracks with chapter counts:", error);
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
      // Calculate the next order number by finding the maximum existing order
      const maxOrderResult = await db
        .select({ maxOrder: sql<number>`COALESCE(MAX(${tracks.order}), 0)` })
        .from(tracks);
      
      const nextOrder = (maxOrderResult[0]?.maxOrder || 0) + 1;
      
      const [newTrack] = await db.insert(tracks).values({
        ...track,
        order: nextOrder,
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
          }
          
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
      console.log('Storage: Raw chapter from DB:', JSON.stringify(chapter, null, 2));
      
      // Ensure content is properly parsed if it's a string
      if (chapter && chapter.content && typeof chapter.content === 'string') {
        try {
          chapter.content = JSON.parse(chapter.content);
          console.log('Storage: Parsed content:', JSON.stringify(chapter.content, null, 2));
        } catch (parseError) {
          console.error('Storage: Failed to parse content JSON:', parseError);
        }
      }
      
      return chapter;
    } catch (error) {
      return memStorage.getChapter(id);
    }
  }

  async createChapter(chapter: any): Promise<any> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.createChapter(chapter);
    
    try {
      // Calculate the next order number within the specific track
      const maxOrderResult = await db
        .select({ maxOrder: sql<number>`COALESCE(MAX(${chapters.order}), 0)` })
        .from(chapters)
        .where(eq(chapters.trackId, chapter.trackId));
      
      const nextOrder = (maxOrderResult[0]?.maxOrder || 0) + 1;
      
      const [newChapter] = await db.insert(chapters).values({
        ...chapter,
        order: nextOrder,
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
      console.log('Updating chapter:', id, 'with data:', JSON.stringify(chapterUpdate, null, 2));
      
      // If updating content, merge with existing content to preserve other languages
      if (chapterUpdate.content) {
        const [existingChapter] = await db.select().from(chapters).where(eq(chapters.id, id));
        if (existingChapter && existingChapter.content) {
          const existingContent = typeof existingChapter.content === 'string' 
            ? JSON.parse(existingChapter.content) 
            : existingChapter.content;
          
          console.log('Existing content:', JSON.stringify(existingContent, null, 2));
          console.log('New content to merge:', JSON.stringify(chapterUpdate.content, null, 2));
          
          chapterUpdate.content = {
            ...existingContent,
            ...chapterUpdate.content
          };
          
          console.log('Final merged content:', JSON.stringify(chapterUpdate.content, null, 2));
        }
      }
      
      const [chapter] = await db
        .update(chapters)
        .set({ ...chapterUpdate, updatedAt: new Date() })
        .where(eq(chapters.id, id))
        .returning();
      
      console.log('Updated chapter result:', JSON.stringify(chapter, null, 2));
      return chapter;
    } catch (error) {
      console.error('Error updating chapter:', error);
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
  async getSegmentsByChapter(chapterId: number, script?: string): Promise<any[]> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.getSegmentsByChapter(chapterId, script);
    
    try {
      const whereConditions = script 
        ? and(eq(textSegments.chapterId, chapterId), eq(textSegments.script, script))
        : eq(textSegments.chapterId, chapterId);
        
      return await db.select().from(textSegments).where(whereConditions).orderBy(textSegments.order);
    } catch (error) {
      return memStorage.getSegmentsByChapter(chapterId, script);
    }
  }

  async createTextSegment(segment: any): Promise<any> {
    await this.ensureInitialized();
    if (!this.initialized) return memStorage.createTextSegment(segment);
    
    try {
      // Validate required fields
      if (!segment.chapterId || !segment.script || 
          segment.startPosition === undefined || segment.endPosition === undefined) {
        throw new Error("Missing required fields: chapterId, script, startPosition, endPosition");
      }
      
      // Get next order value for this chapter and script
      const maxOrderResult = await db
        .select({ maxOrder: max(textSegments.order) })
        .from(textSegments)
        .where(
          and(
            eq(textSegments.chapterId, segment.chapterId),
            eq(textSegments.script, segment.script)
          )
        );
      
      const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;
      
      const [newSegment] = await db.insert(textSegments).values({
        chapterId: segment.chapterId,
        script: segment.script,
        startPosition: segment.startPosition,
        endPosition: segment.endPosition,
        order: segment.order || nextOrder,
        createdBy: segment.createdBy || "system",
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

  async updateSegmentOrder(chapterId: number, segmentOrders: { id: number; order: number }[]): Promise<void> {
    console.log('🔍 REORDER DEBUG - updateSegmentOrder called:');
    console.log('  Chapter ID:', chapterId);
    console.log('  Segment orders to update:', segmentOrders);
    
    await this.ensureInitialized();
    console.log('  Database initialized:', this.initialized);
    
    if (!this.initialized) {
      console.log('⚠️ REORDER DEBUG - Database NOT initialized, skipping update');
      return;
    }
    
    try {
      console.log('🔄 REORDER DEBUG - Starting sequential updates (NO TRANSACTION - Neon poolQueryViaFetch=true does not support transactions)...');
      
      // Execute updates sequentially without transaction
      // Note: Neon's poolQueryViaFetch=true mode does not properly support transactions
      for (const { id, order } of segmentOrders) {
        console.log(`  Updating segment ID ${id} to order ${order}`);
        const result = await db
          .update(textSegments)
          .set({ order })
          .where(eq(textSegments.id, id))
          .returning();
        console.log(`  Updated segment ${id}:`, result);
      }
      
      console.log('✅ REORDER DEBUG - All updates completed successfully');
    } catch (error) {
      console.error('❌ REORDER DEBUG - Error updating segment order:', error);
      throw error;
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
      console.log("Audio mapping created successfully:", newMapping);
      return newMapping;
    } catch (error) {
      console.error("Database mapping creation failed:", error);
      console.error("Mapping data:", mapping);
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