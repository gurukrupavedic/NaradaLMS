import { db } from "./db";
import { 
  tracks,
  chapters,
  audioFiles,
  textSegments,
  mediaSegments,
  segmentMappings,
  studentProgress,
  users
} from "@shared/schema";
import { eq, and, max, asc } from "drizzle-orm";
import { sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<any>;
  getUserByEmail(email: string): Promise<any | null>;
  getUserByProviderId(provider: string, providerId: string): Promise<any | null>;
  createUser(user: any): Promise<any>;
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
  getSegmentsByChapter(chapterId: number, script?: string): Promise<any[]>;
  createTextSegment(segment: any): Promise<any>;
  updateTextSegment(id: number, segment: any): Promise<any>;
  updateSegmentOrder(chapterId: number, segmentOrders: { id: number; order: number }[]): Promise<void>;
  deleteTextSegment(id: number): Promise<void>;

  // Media segment operations
  getMediaSegmentsByAudioFile(audioFileId: number): Promise<any[]>;
  createMediaSegment(segment: any): Promise<any>;
  updateMediaSegment(id: number, segment: any): Promise<any>;
  deleteMediaSegment(id: number): Promise<void>;

  // Segment mapping operations (normalized system)
  getSegmentMappingsByChapter(chapterId: number): Promise<any[]>;
  getSegmentMappingsByAudioFile(audioFileId: number): Promise<any[]>;
  createSegmentMapping(mapping: any): Promise<any>;
  createMappingWithMediaSegment(data: { audioFileId: number; textSegmentId: number; startTime: number; endTime: number; createdBy: string }): Promise<any>;
  deleteSegmentMapping(id: number): Promise<void>;
  deleteSegmentMappingByTextSegment(textSegmentId: number, audioFileId: number): Promise<void>;

  // Student progress
  getStudentProgress(studentId: string): Promise<any[]>;
  getStudentStats(studentId: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  private initialized = false;

  async ensureInitialized() {
    if (this.initialized) return;
    
    // Try to connect - throw error if fails (no silent fallback)
    const existingTracks = await db.select().from(tracks).limit(1);
    
    if (existingTracks.length === 0) {
      console.log("Initializing database with seed data...");
      await this.seedDatabase();
    }
    
    this.initialized = true;
    console.log("Database initialized successfully");
  }

  private async seedDatabase() {
    // Minimal seed: Only create system user
    // Full curriculum seeding should be done via: npm run db:seed
    await db.insert(users).values({
      id: "system",
      email: "system@vediclms.local",
      roles: ["admin"],
      status: "active",
      provider: "local",
      createdAt: new Date(),
      updatedAt: new Date()
    }).onConflictDoNothing();
    
    console.log("Database initialized with system user");
    console.log("Run 'npm run db:seed' to populate curriculum data");
  }

  // User operations
  async getUser(id: string): Promise<any> {
    await this.ensureInitialized();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<any | null> {
    await this.ensureInitialized();
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user ?? null;
  }

  async getUserByProviderId(provider: string, providerId: string): Promise<any | null> {
    await this.ensureInitialized();
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.provider, provider), eq(users.providerId, providerId)));
    return user ?? null;
  }

  async createUser(userData: any): Promise<any> {
    await this.ensureInitialized();
    const result = await db.insert(users).values({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    const user = Array.isArray(result) ? result[0] : (result as any)?.rows?.[0];
    return user;
  }

  async upsertUser(userData: any): Promise<any> {
    await this.ensureInitialized();
    const result = await db
      .insert(users)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          roles: userData.roles ?? sql`excluded.roles`,
          status: userData.status ?? sql`excluded.status`,
          provider: userData.provider ?? sql`excluded.provider`,
          providerId: userData.providerId ?? sql`excluded.provider_id`,
          passwordHash: userData.passwordHash ?? sql`excluded.password_hash`,
          updatedAt: new Date()
        }
      })
      .returning();
    const user = Array.isArray(result) ? result[0] : (result as any)?.rows?.[0];
    return user;
  }

  async getAllUsers(): Promise<any[]> {
    await this.ensureInitialized();
    return await db.select().from(users);
  }

  async updateUserRoles(userId: string, roles: string[]): Promise<any> {
    await this.ensureInitialized();
    const [user] = await db
      .update(users)
      .set({ roles, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserStatus(userId: string, status: string): Promise<any> {
    await this.ensureInitialized();
    const [user] = await db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Track operations
  async getAllTracks(): Promise<any[]> {
    await this.ensureInitialized();
    const allTracks = await db.select().from(tracks).orderBy(tracks.order);
    
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
  }

  async getTrack(id: number): Promise<any | undefined> {
    await this.ensureInitialized();
    const [track] = await db.select().from(tracks).where(eq(tracks.id, id));
    return track;
  }

  async createTrack(track: any): Promise<any> {
    await this.ensureInitialized();
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
  }

  async updateTrack(id: number, trackUpdate: any): Promise<any> {
    await this.ensureInitialized();
    const [track] = await db
      .update(tracks)
      .set({ ...trackUpdate, updatedAt: new Date() })
      .where(eq(tracks.id, id))
      .returning();
    return track;
  }

  async deleteTrack(id: number): Promise<void> {
    await this.ensureInitialized();
    await db.delete(tracks).where(eq(tracks.id, id));
  }

  // Chapter operations
  async getChaptersByTrack(trackId: number): Promise<any[]> {
    await this.ensureInitialized();
    const chapterList = await db.select().from(chapters).where(eq(chapters.trackId, trackId)).orderBy(chapters.order);
    
    const enrichedChapters = await Promise.all(chapterList.map(async (chapter) => {
      const hasContent = Boolean(
        (chapter.content?.te && chapter.content.te.trim().length > 0) ||
        (chapter.content?.hi && chapter.content.hi.trim().length > 0) ||
        (chapter.content?.en && chapter.content.en.trim().length > 0)
      );
      
      const audioFilesList = await db.select().from(audioFiles).where(eq(audioFiles.chapterId, chapter.id));
      const audioFileCount = audioFilesList.length;
      
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
    }));
    
    return enrichedChapters;
  }

  async getChapter(id: number): Promise<any | undefined> {
    await this.ensureInitialized();
    const [chapter] = await db.select().from(chapters).where(eq(chapters.id, id));
    
    if (chapter && chapter.content && typeof chapter.content === 'string') {
      try {
        chapter.content = JSON.parse(chapter.content);
      } catch (parseError) {
        console.error('Storage: Failed to parse content JSON:', parseError);
      }
    }
    
    return chapter;
  }

  async createChapter(chapter: any): Promise<any> {
    await this.ensureInitialized();
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
  }

  async updateChapter(id: number, chapterUpdate: any): Promise<any> {
    await this.ensureInitialized();
    
    if (chapterUpdate.content) {
      const [existingChapter] = await db.select().from(chapters).where(eq(chapters.id, id));
      if (existingChapter && existingChapter.content) {
        const existingContent = typeof existingChapter.content === 'string' 
          ? JSON.parse(existingChapter.content) 
          : existingChapter.content;
        
        chapterUpdate.content = {
          ...existingContent,
          ...chapterUpdate.content
        };
      }
    }
    
    const [chapter] = await db
      .update(chapters)
      .set({ ...chapterUpdate, updatedAt: new Date() })
      .where(eq(chapters.id, id))
      .returning();
    
    return chapter;
  }

  async deleteChapter(id: number): Promise<void> {
    await this.ensureInitialized();
    await db.delete(chapters).where(eq(chapters.id, id));
  }

  // Audio file operations
  async getAudioFilesByChapter(chapterId: number): Promise<any[]> {
    await this.ensureInitialized();
    return await db.select().from(audioFiles).where(eq(audioFiles.chapterId, chapterId));
  }

  async createAudioFile(audioFile: any): Promise<any> {
    await this.ensureInitialized();
    const [newAudioFile] = await db.insert(audioFiles).values({
      ...audioFile,
      createdAt: new Date()
    }).returning();
    return newAudioFile;
  }

  async updateAudioFile(id: number, audioFileUpdate: any): Promise<any> {
    await this.ensureInitialized();
    const [audioFile] = await db
      .update(audioFiles)
      .set(audioFileUpdate)
      .where(eq(audioFiles.id, id))
      .returning();
    return audioFile;
  }

  async deleteAudioFile(id: number): Promise<void> {
    await this.ensureInitialized();
    await db.delete(audioFiles).where(eq(audioFiles.id, id));
  }

  // Text segment operations
  async getSegmentsByChapter(chapterId: number, script?: string): Promise<any[]> {
    await this.ensureInitialized();
    const whereConditions = script 
      ? and(eq(textSegments.chapterId, chapterId), eq(textSegments.script, script))
      : eq(textSegments.chapterId, chapterId);
    
    return await db.select().from(textSegments).where(whereConditions).orderBy(asc(textSegments.order));
  }

  async createTextSegment(segment: any): Promise<any> {
    await this.ensureInitialized();
    
    if (!segment.chapterId || !segment.script || 
        segment.startPosition === undefined || segment.endPosition === undefined) {
      throw new Error("Missing required fields: chapterId, script, startPosition, endPosition");
    }
    
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
  }

  async updateTextSegment(id: number, segmentUpdate: any): Promise<any> {
    await this.ensureInitialized();
    const [segment] = await db
      .update(textSegments)
      .set(segmentUpdate)
      .where(eq(textSegments.id, id))
      .returning();
    return segment;
  }

  async updateSegmentOrder(chapterId: number, segmentOrders: { id: number; order: number }[]): Promise<void> {
    await this.ensureInitialized();
    for (const { id, order } of segmentOrders) {
      await db
        .update(textSegments)
        .set({ order })
        .where(eq(textSegments.id, id))
        .returning();
    }
  }

  async deleteTextSegment(id: number): Promise<void> {
    await this.ensureInitialized();
    await db.delete(textSegments).where(eq(textSegments.id, id));
  }

  // Media segment operations
  async getMediaSegmentsByAudioFile(audioFileId: number): Promise<any[]> {
    await this.ensureInitialized();
    return await db.select()
      .from(mediaSegments)
      .where(eq(mediaSegments.audioFileId, audioFileId))
      .orderBy(mediaSegments.startTimestamp);
  }

  async createMediaSegment(segment: any): Promise<any> {
    await this.ensureInitialized();
    const [newSegment] = await db.insert(mediaSegments).values({
      ...segment,
      createdAt: new Date()
    }).returning();
    return newSegment;
  }

  async updateMediaSegment(id: number, segmentUpdate: any): Promise<any> {
    await this.ensureInitialized();
    const [updatedSegment] = await db.update(mediaSegments)
      .set(segmentUpdate)
      .where(eq(mediaSegments.id, id))
      .returning();
    return updatedSegment;
  }

  async deleteMediaSegment(id: number): Promise<void> {
    await this.ensureInitialized();
    await db.delete(mediaSegments).where(eq(mediaSegments.id, id));
  }

  // Segment mapping operations (normalized system)
  async getSegmentMappingsByChapter(chapterId: number): Promise<any[]> {
    await this.ensureInitialized();
    return await db.select({
      mappingId: segmentMappings.id,
      textSegmentId: segmentMappings.textSegmentId,
      mediaSegmentId: segmentMappings.mediaSegmentId,
      audioFileId: mediaSegments.audioFileId,
      startTime: mediaSegments.startTimestamp,
      endTime: mediaSegments.endTimestamp,
      segmentName: mediaSegments.segmentName
    })
    .from(segmentMappings)
    .leftJoin(mediaSegments, eq(segmentMappings.mediaSegmentId, mediaSegments.id))
    .leftJoin(textSegments, eq(segmentMappings.textSegmentId, textSegments.id))
    .where(eq(textSegments.chapterId, chapterId));
  }

  async getSegmentMappingsByAudioFile(audioFileId: number): Promise<any[]> {
    await this.ensureInitialized();
    return await db.select({
      mappingId: segmentMappings.id,
      textSegmentId: segmentMappings.textSegmentId,
      mediaSegmentId: segmentMappings.mediaSegmentId,
      audioFileId: mediaSegments.audioFileId,
      startTime: mediaSegments.startTimestamp,
      endTime: mediaSegments.endTimestamp,
      segmentName: mediaSegments.segmentName
    })
    .from(segmentMappings)
    .leftJoin(mediaSegments, eq(segmentMappings.mediaSegmentId, mediaSegments.id))
    .where(eq(mediaSegments.audioFileId, audioFileId));
  }

  async createSegmentMapping(mapping: any): Promise<any> {
    await this.ensureInitialized();
    const [newMapping] = await db.insert(segmentMappings).values({
      ...mapping,
      createdAt: new Date()
    }).returning();
    return newMapping;
  }

  async createMappingWithMediaSegment(data: { 
    audioFileId: number; 
    textSegmentId: number; 
    startTime: number; 
    endTime: number; 
    createdBy: string 
  }): Promise<any> {
    await this.ensureInitialized();
    
    const [mediaSegment] = await db.insert(mediaSegments).values({
      audioFileId: data.audioFileId,
      startTimestamp: data.startTime,
      endTimestamp: data.endTime,
      createdBy: data.createdBy,
      createdAt: new Date()
    }).returning();

    const [mapping] = await db.insert(segmentMappings).values({
      mediaSegmentId: mediaSegment.id,
      textSegmentId: data.textSegmentId,
      createdBy: data.createdBy,
      createdAt: new Date()
    }).returning();

    return {
      mappingId: mapping.id,
      textSegmentId: data.textSegmentId,
      mediaSegmentId: mediaSegment.id,
      audioFileId: data.audioFileId,
      startTime: data.startTime,
      endTime: data.endTime
    };
  }

  async deleteSegmentMapping(id: number): Promise<void> {
    await this.ensureInitialized();
    
    const [mapping] = await db.select({ mediaSegmentId: segmentMappings.mediaSegmentId })
      .from(segmentMappings)
      .where(eq(segmentMappings.id, id));
    
    await db.delete(segmentMappings).where(eq(segmentMappings.id, id));
    
    if (mapping?.mediaSegmentId) {
      await db.delete(mediaSegments).where(eq(mediaSegments.id, mapping.mediaSegmentId));
    }
  }

  async deleteSegmentMappingByTextSegment(textSegmentId: number, audioFileId: number): Promise<void> {
    await this.ensureInitialized();
    
    const mappingsToDelete = await db.select({
      mappingId: segmentMappings.id,
      mediaSegmentId: segmentMappings.mediaSegmentId
    })
    .from(segmentMappings)
    .leftJoin(mediaSegments, eq(segmentMappings.mediaSegmentId, mediaSegments.id))
    .where(and(
      eq(segmentMappings.textSegmentId, textSegmentId),
      eq(mediaSegments.audioFileId, audioFileId)
    ));

    for (const mapping of mappingsToDelete) {
      await db.delete(segmentMappings).where(eq(segmentMappings.id, mapping.mappingId));
      if (mapping.mediaSegmentId) {
        await db.delete(mediaSegments).where(eq(mediaSegments.id, mapping.mediaSegmentId));
      }
    }
  }

  // Student progress
  async getStudentProgress(studentId: string): Promise<any[]> {
    await this.ensureInitialized();
    const progress = await db
      .select()
      .from(studentProgress)
      .where(eq(studentProgress.studentId, studentId))
      .orderBy(studentProgress.chapterId, studentProgress.lastEvaluatedAt);
    return progress;
  }

  async getStudentStats(studentId: string): Promise<any> {
    await this.ensureInitialized();
    return {
      totalStudyTime: 0,
      chaptersCompleted: 0,
      currentStreak: 0,
      highestLevel: 1
    };
  }
}

export const storage = new DatabaseStorage();
