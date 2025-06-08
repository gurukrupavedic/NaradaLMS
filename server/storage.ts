import { db } from "./db";
import { 
  tracks, chapters, audioFiles, textSegments, audioMappings, users,
  type Track, type Chapter, type AudioFile, type TextSegment, type AudioMapping, type User,
  type InsertTrack, type InsertChapter, type InsertAudioFile, type InsertTextSegment, type InsertAudioMapping, type UpsertUser
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRoles(userId: string, roles: string[]): Promise<User>;
  updateUserStatus(userId: string, status: string): Promise<User>;
  
  // Track operations
  getAllTracks(): Promise<Track[]>;
  getTrack(id: number): Promise<Track | undefined>;
  createTrack(track: InsertTrack): Promise<Track>;
  updateTrack(id: number, track: Partial<InsertTrack>): Promise<Track>;
  deleteTrack(id: number): Promise<void>;

  // Chapter operations
  getChaptersByTrack(trackId: number): Promise<Chapter[]>;
  getChapter(id: number): Promise<Chapter | undefined>;
  createChapter(chapter: InsertChapter): Promise<Chapter>;
  updateChapter(id: number, chapter: Partial<InsertChapter>): Promise<Chapter>;
  deleteChapter(id: number): Promise<void>;

  // Audio file operations
  getAudioFilesByChapter(chapterId: number): Promise<AudioFile[]>;
  createAudioFile(audioFile: InsertAudioFile): Promise<AudioFile>;
  updateAudioFile(id: number, audioFile: Partial<InsertAudioFile>): Promise<AudioFile>;
  deleteAudioFile(id: number): Promise<void>;

  // Text segment operations
  getSegmentsByChapter(chapterId: number): Promise<TextSegment[]>;
  createTextSegment(segment: InsertTextSegment): Promise<TextSegment>;
  updateTextSegment(id: number, segment: Partial<InsertTextSegment>): Promise<TextSegment>;
  deleteTextSegment(id: number): Promise<void>;

  // Audio mapping operations
  getMappingsByAudioFile(audioFileId: number): Promise<AudioMapping[]>;
  getMappingsBySegment(segmentId: number): Promise<AudioMapping[]>;
  createAudioMapping(mapping: InsertAudioMapping): Promise<AudioMapping>;
  deleteAudioMapping(audioFileId: number, segmentId: number): Promise<void>;

  // Student progress
  getStudentProgress(studentId: string): Promise<any[]>;
  getStudentStats(studentId: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
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
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserRoles(userId: string, roles: string[]): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ roles, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserStatus(userId: string, status: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Track operations
  async getAllTracks(): Promise<Track[]> {
    return await db.select().from(tracks).orderBy(tracks.order);
  }

  async getTrack(id: number): Promise<Track | undefined> {
    const [track] = await db.select().from(tracks).where(eq(tracks.id, id));
    return track || undefined;
  }

  async createTrack(track: InsertTrack): Promise<Track> {
    const trackData = {
      ...track,
      order: 1,
      createdBy: "system",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const [newTrack] = await db.insert(tracks).values(trackData).returning();
    return newTrack;
  }

  async updateTrack(id: number, trackUpdate: Partial<InsertTrack>): Promise<Track> {
    const [track] = await db
      .update(tracks)
      .set({ ...trackUpdate, updatedAt: new Date() })
      .where(eq(tracks.id, id))
      .returning();
    return track;
  }

  async deleteTrack(id: number): Promise<void> {
    await db.delete(tracks).where(eq(tracks.id, id));
  }

  // Chapter operations
  async getChaptersByTrack(trackId: number): Promise<Chapter[]> {
    return await db.select().from(chapters).where(eq(chapters.trackId, trackId)).orderBy(chapters.order);
  }

  async getChapter(id: number): Promise<Chapter | undefined> {
    const [chapter] = await db.select().from(chapters).where(eq(chapters.id, id));
    return chapter || undefined;
  }

  async createChapter(chapter: InsertChapter): Promise<Chapter> {
    const chapterData = {
      ...chapter,
      order: 1,
      createdBy: "system",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const [newChapter] = await db.insert(chapters).values(chapterData).returning();
    return newChapter;
  }

  async updateChapter(id: number, chapterUpdate: Partial<InsertChapter>): Promise<Chapter> {
    const [chapter] = await db
      .update(chapters)
      .set({ ...chapterUpdate, updatedAt: new Date() })
      .where(eq(chapters.id, id))
      .returning();
    return chapter;
  }

  async deleteChapter(id: number): Promise<void> {
    await db.delete(chapters).where(eq(chapters.id, id));
  }

  // Audio file operations
  async getAudioFilesByChapter(chapterId: number): Promise<AudioFile[]> {
    return await db.select().from(audioFiles).where(eq(audioFiles.chapterId, chapterId));
  }

  async createAudioFile(audioFile: InsertAudioFile): Promise<AudioFile> {
    const [newAudioFile] = await db.insert(audioFiles).values(audioFile).returning();
    return newAudioFile;
  }

  async updateAudioFile(id: number, audioFileUpdate: Partial<InsertAudioFile>): Promise<AudioFile> {
    const [audioFile] = await db
      .update(audioFiles)
      .set(audioFileUpdate)
      .where(eq(audioFiles.id, id))
      .returning();
    return audioFile;
  }

  async deleteAudioFile(id: number): Promise<void> {
    await db.delete(audioFiles).where(eq(audioFiles.id, id));
  }

  // Text segment operations
  async getSegmentsByChapter(chapterId: number): Promise<TextSegment[]> {
    return await db.select().from(textSegments).where(eq(textSegments.chapterId, chapterId));
  }

  async createTextSegment(segment: InsertTextSegment): Promise<TextSegment> {
    const [newSegment] = await db.insert(textSegments).values(segment).returning();
    return newSegment;
  }

  async updateTextSegment(id: number, segmentUpdate: Partial<InsertTextSegment>): Promise<TextSegment> {
    const [segment] = await db
      .update(textSegments)
      .set(segmentUpdate)
      .where(eq(textSegments.id, id))
      .returning();
    return segment;
  }

  async deleteTextSegment(id: number): Promise<void> {
    await db.delete(textSegments).where(eq(textSegments.id, id));
  }

  // Audio mapping operations
  async getMappingsByAudioFile(audioFileId: number): Promise<AudioMapping[]> {
    return await db.select().from(audioMappings).where(eq(audioMappings.audioFileId, audioFileId));
  }

  async getMappingsBySegment(segmentId: number): Promise<AudioMapping[]> {
    return await db.select().from(audioMappings).where(eq(audioMappings.segmentId, segmentId));
  }

  async createAudioMapping(mapping: InsertAudioMapping): Promise<AudioMapping> {
    const [newMapping] = await db.insert(audioMappings).values(mapping).returning();
    return newMapping;
  }

  async deleteAudioMapping(audioFileId: number, segmentId: number): Promise<void> {
    await db.delete(audioMappings)
      .where(eq(audioMappings.audioFileId, audioFileId))
      .where(eq(audioMappings.segmentId, segmentId));
  }

  // Student progress (simplified for now)
  async getStudentProgress(studentId: string): Promise<any[]> {
    return [];
  }

  async getStudentStats(studentId: string): Promise<any> {
    return {
      totalStudyTime: 0,
      chaptersCompleted: 0,
      currentStreak: 0,
      highestLevel: 1
    };
  }
}

export const storage = new DatabaseStorage();