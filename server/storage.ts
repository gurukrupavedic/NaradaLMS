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
import { eq, and, desc, asc } from "drizzle-orm";

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

  // Student progress operations
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
    return await db.select().from(users).orderBy(asc(users.firstName), asc(users.lastName));
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
    return await db.select().from(tracks).orderBy(asc(tracks.order));
  }

  async getTrack(id: number): Promise<Track | undefined> {
    const [track] = await db.select().from(tracks).where(eq(tracks.id, id));
    return track;
  }

  async createTrack(track: InsertTrack): Promise<Track> {
    const [newTrack] = await db.insert(tracks).values(track).returning();
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

  // Chapter operations
  async getChaptersByTrack(trackId: number): Promise<Chapter[]> {
    return await db
      .select()
      .from(chapters)
      .where(eq(chapters.trackId, trackId))
      .orderBy(asc(chapters.order));
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

  // Audio file operations
  async getAudioFilesByChapter(chapterId: number): Promise<AudioFile[]> {
    return await db
      .select()
      .from(audioFiles)
      .where(eq(audioFiles.chapterId, chapterId))
      .orderBy(asc(audioFiles.originalName));
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
      .orderBy(asc(textSegments.id));
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
        and(
          eq(audioMappings.audioFileId, audioFileId),
          eq(audioMappings.segmentId, segmentId)
        )
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
        and(
          eq(studentProgress.studentId, studentId),
          eq(studentProgress.chapterId, chapterId)
        )
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
        student: users,
        chapter: chapters,
        track: tracks,
      })
      .from(studentProgress)
      .innerJoin(users, eq(studentProgress.studentId, users.id))
      .innerJoin(chapters, eq(studentProgress.chapterId, chapters.id))
      .innerJoin(tracks, eq(chapters.trackId, tracks.id))
      .orderBy(desc(studentProgress.updatedAt));

    return result.map(row => ({
      ...row,
      chapter: {
        ...row.chapter,
        track: row.track,
      },
    }));
  }

  async updateStudentProgress(progress: InsertStudentProgress): Promise<StudentProgress> {
    const [updatedProgress] = await db
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
    return updatedProgress;
  }
}

export const storage = new DatabaseStorage();
