import {
  users,
  tracks,
  chapters,
  audioFiles,
  segments,
  audioSegmentMappings,
  studentProgress,
  type User,
  type UpsertUser,
  type InsertTrack,
  type Track,
  type TrackWithChapters,
  type InsertChapter,
  type Chapter,
  type ChapterWithDetails,
  type InsertAudioFile,
  type AudioFile,
  type InsertSegment,
  type Segment,
  type InsertAudioSegmentMapping,
  type AudioSegmentMapping,
  type InsertStudentProgress,
  type StudentProgress,
  type StudentWithProgress,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User management
  getAllUsers(): Promise<User[]>;
  updateUserRoles(userId: string, roles: string[]): Promise<User>;
  updateUserStatus(userId: string, status: string): Promise<User>;
  
  // Track operations
  getTracks(): Promise<TrackWithChapters[]>;
  getTrack(id: number): Promise<TrackWithChapters | undefined>;
  createTrack(track: InsertTrack): Promise<Track>;
  updateTrack(id: number, track: Partial<InsertTrack>): Promise<Track>;
  deleteTrack(id: number): Promise<void>;
  
  // Chapter operations
  getChapter(id: number): Promise<ChapterWithDetails | undefined>;
  getChaptersByTrack(trackId: number): Promise<Chapter[]>;
  createChapter(chapter: InsertChapter): Promise<Chapter>;
  updateChapter(id: number, chapter: Partial<InsertChapter>): Promise<Chapter>;
  deleteChapter(id: number): Promise<void>;
  
  // Audio file operations
  createAudioFile(audioFile: InsertAudioFile): Promise<AudioFile>;
  getAudioFilesByChapter(chapterId: number): Promise<AudioFile[]>;
  deleteAudioFile(id: number): Promise<void>;
  
  // Segment operations
  createSegment(segment: InsertSegment): Promise<Segment>;
  getSegmentsByChapter(chapterId: number): Promise<Segment[]>;
  updateSegment(id: number, segment: Partial<InsertSegment>): Promise<Segment>;
  deleteSegment(id: number): Promise<void>;
  
  // Audio-segment mapping operations
  createAudioSegmentMapping(mapping: InsertAudioSegmentMapping): Promise<AudioSegmentMapping>;
  getMappingsByChapter(chapterId: number): Promise<(AudioSegmentMapping & { audioFile: AudioFile; segment: Segment })[]>;
  deleteMappingsBySegment(segmentId: number): Promise<void>;
  
  // Student progress operations
  getStudentProgress(studentId: string, chapterId: number): Promise<StudentProgress | undefined>;
  upsertStudentProgress(progress: InsertStudentProgress): Promise<StudentProgress>;
  getStudentsWithProgress(): Promise<StudentWithProgress[]>;
  getStudentProgressByTrack(studentId: string, trackId: number): Promise<StudentProgress[]>;
  bulkUpdateProgress(progressUpdates: InsertStudentProgress[]): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
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

  // User management
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
  async getTracks(): Promise<TrackWithChapters[]> {
    const tracksData = await db
      .select({
        track: tracks,
        chapterCount: sql<number>`count(${chapters.id})::int`,
      })
      .from(tracks)
      .leftJoin(chapters, eq(tracks.id, chapters.trackId))
      .groupBy(tracks.id)
      .orderBy(tracks.order);

    const tracksWithChapters: TrackWithChapters[] = [];
    
    for (const { track, chapterCount } of tracksData) {
      const chaptersList = await this.getChaptersByTrack(track.id);
      tracksWithChapters.push({
        ...track,
        chapters: chaptersList,
        chapterCount,
      });
    }

    return tracksWithChapters;
  }

  async getTrack(id: number): Promise<TrackWithChapters | undefined> {
    const [track] = await db.select().from(tracks).where(eq(tracks.id, id));
    if (!track) return undefined;

    const chaptersList = await this.getChaptersByTrack(id);
    return {
      ...track,
      chapters: chaptersList,
      chapterCount: chaptersList.length,
    };
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
  async getChapter(id: number): Promise<ChapterWithDetails | undefined> {
    const [chapter] = await db
      .select({
        chapter: chapters,
        track: tracks,
      })
      .from(chapters)
      .innerJoin(tracks, eq(chapters.trackId, tracks.id))
      .where(eq(chapters.id, id));

    if (!chapter) return undefined;

    const audioFilesList = await this.getAudioFilesByChapter(id);
    const segmentsList = await this.getSegmentsByChapter(id);
    const mappingsList = await this.getMappingsByChapter(id);

    // Group mappings by segment
    const segmentsWithMappings = segmentsList.map(segment => ({
      ...segment,
      mappings: mappingsList.filter(mapping => mapping.segmentId === segment.id),
    }));

    return {
      ...chapter.chapter,
      track: chapter.track,
      audioFiles: audioFilesList,
      segments: segmentsWithMappings,
    };
  }

  async getChaptersByTrack(trackId: number): Promise<Chapter[]> {
    return await db
      .select()
      .from(chapters)
      .where(eq(chapters.trackId, trackId))
      .orderBy(chapters.order);
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
  async createAudioFile(audioFile: InsertAudioFile): Promise<AudioFile> {
    const [newAudioFile] = await db.insert(audioFiles).values(audioFile).returning();
    return newAudioFile;
  }

  async getAudioFilesByChapter(chapterId: number): Promise<AudioFile[]> {
    return await db
      .select()
      .from(audioFiles)
      .where(eq(audioFiles.chapterId, chapterId))
      .orderBy(audioFiles.createdAt);
  }

  async deleteAudioFile(id: number): Promise<void> {
    await db.delete(audioFiles).where(eq(audioFiles.id, id));
  }

  // Segment operations
  async createSegment(segment: InsertSegment): Promise<Segment> {
    const [newSegment] = await db.insert(segments).values(segment).returning();
    return newSegment;
  }

  async getSegmentsByChapter(chapterId: number): Promise<Segment[]> {
    return await db
      .select()
      .from(segments)
      .where(eq(segments.chapterId, chapterId))
      .orderBy(segments.order);
  }

  async updateSegment(id: number, segment: Partial<InsertSegment>): Promise<Segment> {
    const [updatedSegment] = await db
      .update(segments)
      .set(segment)
      .where(eq(segments.id, id))
      .returning();
    return updatedSegment;
  }

  async deleteSegment(id: number): Promise<void> {
    await db.delete(segments).where(eq(segments.id, id));
  }

  // Audio-segment mapping operations
  async createAudioSegmentMapping(mapping: InsertAudioSegmentMapping): Promise<AudioSegmentMapping> {
    const [newMapping] = await db.insert(audioSegmentMappings).values(mapping).returning();
    return newMapping;
  }

  async getMappingsByChapter(chapterId: number): Promise<(AudioSegmentMapping & { audioFile: AudioFile; segment: Segment })[]> {
    return await db
      .select({
        id: audioSegmentMappings.id,
        audioFileId: audioSegmentMappings.audioFileId,
        segmentId: audioSegmentMappings.segmentId,
        startTime: audioSegmentMappings.startTime,
        endTime: audioSegmentMappings.endTime,
        createdBy: audioSegmentMappings.createdBy,
        createdAt: audioSegmentMappings.createdAt,
        audioFile: audioFiles,
        segment: segments,
      })
      .from(audioSegmentMappings)
      .innerJoin(audioFiles, eq(audioSegmentMappings.audioFileId, audioFiles.id))
      .innerJoin(segments, eq(audioSegmentMappings.segmentId, segments.id))
      .where(eq(segments.chapterId, chapterId));
  }

  async deleteMappingsBySegment(segmentId: number): Promise<void> {
    await db.delete(audioSegmentMappings).where(eq(audioSegmentMappings.segmentId, segmentId));
  }

  // Student progress operations
  async getStudentProgress(studentId: string, chapterId: number): Promise<StudentProgress | undefined> {
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

  async upsertStudentProgress(progress: InsertStudentProgress): Promise<StudentProgress> {
    const [upsertedProgress] = await db
      .insert(studentProgress)
      .values(progress)
      .onConflictDoUpdate({
        target: [studentProgress.studentId, studentProgress.chapterId],
        set: {
          proficiencyLevel: progress.proficiencyLevel,
          updatedBy: progress.updatedBy,
          updatedAt: new Date(),
        },
      })
      .returning();
    return upsertedProgress;
  }

  async getStudentsWithProgress(): Promise<StudentWithProgress[]> {
    const studentsData = await db
      .select({
        user: users,
        progress: studentProgress,
        chapter: chapters,
        track: tracks,
      })
      .from(users)
      .leftJoin(studentProgress, eq(users.id, studentProgress.studentId))
      .leftJoin(chapters, eq(studentProgress.chapterId, chapters.id))
      .leftJoin(tracks, eq(chapters.trackId, tracks.id))
      .where(sql`${users.roles} ? 'student'`)
      .orderBy(users.firstName, users.lastName, users.email);

    // Group by user
    const studentsMap = new Map<string, StudentWithProgress>();
    
    for (const row of studentsData) {
      if (!studentsMap.has(row.user.id)) {
        studentsMap.set(row.user.id, {
          ...row.user,
          progress: [],
        });
      }
      
      const student = studentsMap.get(row.user.id)!;
      if (row.progress && row.chapter && row.track) {
        student.progress.push({
          ...row.progress,
          chapter: {
            ...row.chapter,
            track: row.track,
          },
        });
      }
    }

    return Array.from(studentsMap.values());
  }

  async getStudentProgressByTrack(studentId: string, trackId: number): Promise<StudentProgress[]> {
    return await db
      .select({
        id: studentProgress.id,
        studentId: studentProgress.studentId,
        chapterId: studentProgress.chapterId,
        proficiencyLevel: studentProgress.proficiencyLevel,
        updatedBy: studentProgress.updatedBy,
        updatedAt: studentProgress.updatedAt,
      })
      .from(studentProgress)
      .innerJoin(chapters, eq(studentProgress.chapterId, chapters.id))
      .where(
        and(
          eq(studentProgress.studentId, studentId),
          eq(chapters.trackId, trackId)
        )
      );
  }

  async bulkUpdateProgress(progressUpdates: InsertStudentProgress[]): Promise<void> {
    // Use a transaction for bulk updates
    await db.transaction(async (tx) => {
      for (const progress of progressUpdates) {
        await tx
          .insert(studentProgress)
          .values(progress)
          .onConflictDoUpdate({
            target: [studentProgress.studentId, studentProgress.chapterId],
            set: {
              proficiencyLevel: progress.proficiencyLevel,
              updatedBy: progress.updatedBy,
              updatedAt: new Date(),
            },
          });
      }
    });
  }
}

export const storage = new DatabaseStorage();
