import {
  users,
  tracks,
  chapters,
  audioFiles,
  textSegments,
  audioMappings,
  studentProgress,
  type User,
  type UpsertUser,
  type Track,
  type InsertTrack,
  type Chapter,
  type InsertChapter,
  type AudioFile,
  type InsertAudioFile,
  type TextSegment,
  type InsertTextSegment,
  type AudioMapping,
  type InsertAudioMapping,
  type StudentProgress,
  type InsertStudentProgress,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRoles(userId: string, roles: string[]): Promise<User>;
  updateUserStatus(userId: string, status: string): Promise<User>;

  // Track operations with draft/published workflow
  getAllTracks(): Promise<Track[]>;
  getTrack(id: number): Promise<Track | undefined>;
  createTrack(track: InsertTrack): Promise<Track>;
  updateTrack(id: number, track: Partial<InsertTrack>): Promise<Track>;
  deleteTrack(id: number): Promise<void>;
  publishTrack(id: number, publishedBy: string): Promise<Track>;

  // Chapter operations with content management workflow
  getChaptersByTrack(trackId: number): Promise<Chapter[]>;
  getChapter(id: number): Promise<Chapter | undefined>;
  createChapter(chapter: InsertChapter): Promise<Chapter>;
  updateChapter(id: number, chapter: Partial<InsertChapter>): Promise<Chapter>;
  deleteChapter(id: number): Promise<void>;
  publishChapter(id: number, publishedBy: string): Promise<Chapter>;

  // Audio file operations
  getAudioFilesByChapter(chapterId: number): Promise<AudioFile[]>;
  createAudioFile(audioFile: InsertAudioFile): Promise<AudioFile>;
  deleteAudioFile(id: number): Promise<void>;

  // Text segment operations - Character offset based
  getSegmentsByChapter(chapterId: number): Promise<TextSegment[]>;
  createTextSegment(segment: InsertTextSegment): Promise<TextSegment>;
  updateTextSegment(id: number, segment: Partial<InsertTextSegment>): Promise<TextSegment>;
  deleteTextSegment(id: number): Promise<void>;

  // Audio mapping operations - Timestamp linking
  getMappingsByAudioFile(audioFileId: number): Promise<AudioMapping[]>;
  getMappingsBySegment(segmentId: number): Promise<AudioMapping[]>;
  createAudioMapping(mapping: InsertAudioMapping): Promise<AudioMapping>;
  deleteAudioMapping(audioFileId: number, segmentId: number): Promise<void>;

  // Student progress operations with proficiency levels
  getStudentProgress(studentId: string): Promise<StudentProgress[]>;
  getStudentProgressByChapter(studentId: string, chapterId: number): Promise<StudentProgress | undefined>;
  getAllStudentProgress(): Promise<(StudentProgress & { student: User; chapter: Chapter & { track: Track } })[]>;
  updateStudentProgress(progress: InsertStudentProgress): Promise<StudentProgress>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    const result = await db.select().from(users).orderBy(desc(users.createdAt));
    return result;
  }

  async updateUserRoles(userId: string, roles: string[]): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        roles: roles,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserStatus(userId: string, status: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        status: status,
        updatedAt: new Date() 
      })
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
    return track;
  }

  async createTrack(track: InsertTrack): Promise<Track> {
    // Get the next sequential order number
    const lastTrack = await db
      .select({ order: tracks.order })
      .from(tracks)
      .orderBy(desc(tracks.order))
      .limit(1);
    
    const nextOrder = lastTrack.length > 0 ? lastTrack[0].order + 1 : 1;
    
    const [newTrack] = await db.insert(tracks).values({
      ...track,
      order: nextOrder
    }).returning();
    return newTrack;
  }

  async updateTrack(id: number, track: Partial<InsertTrack>): Promise<Track> {
    const [updatedTrack] = await db
      .update(tracks)
      .set({ ...track, updatedAt: new Date() })
      .where(eq(tracks.id, id))
      .returning();
    return updatedTrack;
  }

  async deleteTrack(id: number): Promise<void> {
    await db.delete(tracks).where(eq(tracks.id, id));
  }

  async publishTrack(id: number, publishedBy: string): Promise<Track> {
    const [track] = await db
      .update(tracks)
      .set({ 
        status: "published",
        updatedAt: new Date() 
      })
      .where(eq(tracks.id, id))
      .returning();
    return track;
  }

  // Chapter operations
  async getChaptersByTrack(trackId: number): Promise<Chapter[]> {
    return await db
      .select()
      .from(chapters)
      .where(eq(chapters.trackId, trackId))
      .orderBy(chapters.order);
  }

  async getChapter(id: number): Promise<Chapter | undefined> {
    const [chapter] = await db.select().from(chapters).where(eq(chapters.id, id));
    return chapter;
  }

  async createChapter(chapter: InsertChapter): Promise<Chapter> {
    const [newChapter] = await db.insert(chapters).values(chapter).returning();
    return newChapter;
  }

  async updateChapter(id: number, chapter: Partial<InsertChapter>): Promise<Chapter> {
    const [updatedChapter] = await db
      .update(chapters)
      .set({ ...chapter, updatedAt: new Date() })
      .where(eq(chapters.id, id))
      .returning();
    return updatedChapter;
  }

  async deleteChapter(id: number): Promise<void> {
    await db.delete(chapters).where(eq(chapters.id, id));
  }

  async publishChapter(id: number, publishedBy: string): Promise<Chapter> {
    const [chapter] = await db
      .update(chapters)
      .set({ 
        status: "published",
        publishedAt: new Date(),
        lastEditedBy: publishedBy,
        updatedAt: new Date() 
      })
      .where(eq(chapters.id, id))
      .returning();
    return chapter;
  }

  // Audio file operations
  async getAudioFilesByChapter(chapterId: number): Promise<AudioFile[]> {
    return await db
      .select()
      .from(audioFiles)
      .where(eq(audioFiles.chapterId, chapterId))
      .orderBy(desc(audioFiles.createdAt));
  }

  async createAudioFile(audioFile: InsertAudioFile): Promise<AudioFile> {
    const [newAudioFile] = await db.insert(audioFiles).values(audioFile).returning();
    return newAudioFile;
  }

  async deleteAudioFile(id: number): Promise<void> {
    await db.delete(audioFiles).where(eq(audioFiles.id, id));
  }

  // Text segment operations
  async getSegmentsByChapter(chapterId: number): Promise<TextSegment[]> {
    return await db
      .select()
      .from(textSegments)
      .where(eq(textSegments.chapterId, chapterId))
      .orderBy(desc(textSegments.createdAt));
  }

  async createTextSegment(segment: InsertTextSegment): Promise<TextSegment> {
    const [newSegment] = await db.insert(textSegments).values(segment).returning();
    return newSegment;
  }

  async updateTextSegment(id: number, segment: Partial<InsertTextSegment>): Promise<TextSegment> {
    const [updatedSegment] = await db
      .update(textSegments)
      .set(segment)
      .where(eq(textSegments.id, id))
      .returning();
    return updatedSegment;
  }

  async deleteTextSegment(id: number): Promise<void> {
    await db.delete(textSegments).where(eq(textSegments.id, id));
  }

  // Audio mapping operations
  async getMappingsByAudioFile(audioFileId: number): Promise<AudioMapping[]> {
    return await db
      .select()
      .from(audioMappings)
      .where(eq(audioMappings.audioFileId, audioFileId));
  }

  async getMappingsBySegment(segmentId: number): Promise<AudioMapping[]> {
    return await db
      .select()
      .from(audioMappings)
      .where(eq(audioMappings.segmentId, segmentId));
  }

  async createAudioMapping(mapping: InsertAudioMapping): Promise<AudioMapping> {
    const [newMapping] = await db.insert(audioMappings).values(mapping).returning();
    return newMapping;
  }

  async deleteAudioMapping(audioFileId: number, segmentId: number): Promise<void> {
    await db
      .delete(audioMappings)
      .where(
        sql`${audioMappings.audioFileId} = ${audioFileId} AND ${audioMappings.segmentId} = ${segmentId}`
      );
  }

  // Student progress operations
  async getStudentProgress(studentId: string): Promise<StudentProgress[]> {
    return await db
      .select()
      .from(studentProgress)
      .where(eq(studentProgress.studentId, studentId))
      .orderBy(desc(studentProgress.updatedAt));
  }

  async getStudentProgressByChapter(studentId: string, chapterId: number): Promise<StudentProgress | undefined> {
    const [progress] = await db
      .select()
      .from(studentProgress)
      .where(
        sql`${studentProgress.studentId} = ${studentId} AND ${studentProgress.chapterId} = ${chapterId}`
      );
    return progress;
  }

  async getAllStudentProgress(): Promise<(StudentProgress & { student: User; chapter: Chapter & { track: Track } })[]> {
    const result = await db
      .select({
        id: studentProgress.id,
        studentId: studentProgress.studentId,
        chapterId: studentProgress.chapterId,
        proficiencyLevel: studentProgress.proficiencyLevel,
        lastAccessed: studentProgress.lastAccessed,
        updatedBy: studentProgress.updatedBy,
        updatedAt: studentProgress.updatedAt,
        student: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          roles: users.roles,
          status: users.status,
          invitedBy: users.invitedBy,
          invitedAt: users.invitedAt,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
        chapter: {
          id: chapters.id,
          trackId: chapters.trackId,
          title: chapters.title,
          order: chapters.order,
          status: chapters.status,
          content: chapters.content,
          publishedAt: chapters.publishedAt,
          lastEditedBy: chapters.lastEditedBy,
          createdBy: chapters.createdBy,
          createdAt: chapters.createdAt,
          updatedAt: chapters.updatedAt,
          track: {
            id: tracks.id,
            title: tracks.title,
            description: tracks.description,
            order: tracks.order,
            status: tracks.status,
            estimatedHours: tracks.estimatedHours,
            createdBy: tracks.createdBy,
            createdAt: tracks.createdAt,
            updatedAt: tracks.updatedAt,
          },
        },
      })
      .from(studentProgress)
      .innerJoin(users, eq(studentProgress.studentId, users.id))
      .innerJoin(chapters, eq(studentProgress.chapterId, chapters.id))
      .innerJoin(tracks, eq(chapters.trackId, tracks.id))
      .orderBy(desc(studentProgress.updatedAt));

    return result as any;
  }

  async updateStudentProgress(progress: InsertStudentProgress): Promise<StudentProgress> {
    const [newProgress] = await db
      .insert(studentProgress)
      .values(progress)
      .onConflictDoUpdate({
        target: [studentProgress.studentId, studentProgress.chapterId],
        set: {
          proficiencyLevel: progress.proficiencyLevel,
          lastAccessed: progress.lastAccessed,
          updatedBy: progress.updatedBy,
          updatedAt: new Date(),
        },
      })
      .returning();
    return newProgress;
  }
}

export const storage = new DatabaseStorage();