import { db } from "../../db";
import { eq, sql } from "drizzle-orm";
import { batches, enrollments, batchCoInstructors, users, tracks } from "@shared/schema";
import type { BatchCreateInput, BatchUpdateInput, EnrollmentCreateInput, EnrollmentDropInput, CoInstructorAssignInput } from "./types";

export class BatchStorage {
  async listBatches() {
    return db.select().from(batches).orderBy(batches.createdAt);
  }

  async getBatchById(id: number) {
    const rows = await db.select().from(batches).where(eq(batches.id, id));
    return rows[0] || null;
  }

  async createBatch(input: BatchCreateInput) {
    const [created] = await db.insert(batches).values({
      batchCode: input.batchCode,
      batchName: input.batchName,
      trackId: input.trackId ?? null,
      primaryInstructorId: input.primaryInstructorId ?? null,
      status: 'active',
      createdBy: input.createdBy,
    }).returning();
    return created;
  }

  async updateBatch(id: number, input: BatchUpdateInput) {
    const [updated] = await db.update(batches).set({
      batchCode: input.batchCode ?? undefined,
      batchName: input.batchName ?? undefined,
      trackId: input.trackId === undefined ? undefined : input.trackId,
      primaryInstructorId: input.primaryInstructorId === undefined ? undefined : input.primaryInstructorId,
      status: input.status ?? undefined,
      updatedAt: new Date(),
    }).where(eq(batches.id, id)).returning();
    return updated;
  }

  async addEnrollment(input: EnrollmentCreateInput) {
    const [created] = await db.insert(enrollments).values({
      batchId: input.batchId,
      studentId: input.studentId,
      status: 'active',
      enrolledBy: input.enrolledBy,
    }).returning();
    return created;
  }

  async dropEnrollment(input: EnrollmentDropInput) {
    const [updated] = await db.update(enrollments).set({
      status: 'dropped',
      droppedAt: new Date(),
      droppedReason: input.droppedReason ?? null,
      updatedAt: new Date(),
    }).where(eq(enrollments.id, input.enrollmentId)).returning();
    return updated;
  }

  async listEnrollmentsByBatch(batchId: number) {
    return db.select().from(enrollments).where(eq(enrollments.batchId, batchId));
  }

  async assignCoInstructor(input: CoInstructorAssignInput) {
    const [created] = await db.insert(batchCoInstructors).values({
      batchId: input.batchId,
      instructorId: input.instructorId,
      role: input.role ?? 'co_instructor',
      assignedBy: input.assignedBy,
    }).returning();
    return created;
  }

  async removeCoInstructor(assignmentId: number) {
    const [removed] = await db.delete(batchCoInstructors).where(eq(batchCoInstructors.id, assignmentId)).returning();
    return removed;
  }

  async listCoInstructorsByBatch(batchId: number) {
    return db.select().from(batchCoInstructors).where(eq(batchCoInstructors.batchId, batchId));
  }

  // Basic existence checks for foreign keys
  async userExists(userId: string) {
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
    return !!rows[0];
  }

  async trackExists(trackId: number) {
    const rows = await db.select({ id: tracks.id }).from(tracks).where(eq(tracks.id, trackId));
    return !!rows[0];
  }

  // Phase 5: Evaluation methods
  async getBatchProgress(batchId: number) {
    const { studentProgress, chapters } = await import('@shared/schema');
    const { and, inArray } = await import('drizzle-orm');

    // Get batch info
    const batchInfo = await this.getBatchById(batchId);
    if (!batchInfo) return null;

    // Get all active students in batch
    const enrollmentsList = await db
      .select({
        studentId: enrollments.studentId,
        studentName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
        email: users.email,
      })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .where(and(
        eq(enrollments.batchId, batchId),
        eq(enrollments.status, 'active')
      ));

    if (enrollmentsList.length === 0) {
      return {
        batchId,
        batchName: batchInfo.batchName,
        trackId: batchInfo.trackId,
        trackName: null,
        students: [],
      };
    }

    // Get track chapters if trackId exists
    let chaptersList: any[] = [];
    if (batchInfo.trackId) {
      chaptersList = await db
        .select({
          chapterId: chapters.id,
          chapterTitle: chapters.title,
          chapterNumber: chapters.chapterNumber,
        })
        .from(chapters)
        .where(eq(chapters.trackId, batchInfo.trackId))
        .orderBy(chapters.chapterNumber);
    }

    // Get student IDs for progress query
    const studentIds = enrollmentsList.map(e => e.studentId);
    const chapterIds = chaptersList.map(c => c.chapterId);

    // Get all progress records for these students/chapters
    let progressRecords: any[] = [];
    if (chapterIds.length > 0) {
      progressRecords = await db
        .select()
        .from(studentProgress)
        .where(and(
          inArray(studentProgress.studentId, studentIds),
          inArray(studentProgress.chapterId, chapterIds)
        ));
    }

    // Build response structure
    const students = enrollmentsList.map(enrollment => {
      const chaptersProgress = chaptersList.map(chapter => {
        const progress = progressRecords.find(
          p => p.studentId === enrollment.studentId && p.chapterId === chapter.chapterId
        );

        return {
          chapterId: chapter.chapterId,
          chapterTitle: chapter.chapterTitle,
          chapterNumber: chapter.chapterNumber,
          proficiencyLevel: progress?.proficiencyLevel ?? null,
          lastAccessed: progress?.lastAccessed ?? null,
          lastEvaluatedAt: progress?.lastEvaluatedAt ?? null,
          evaluatedBy: progress?.evaluatedBy ?? null,
          notes: progress?.notes ?? null,
        };
      });

      return {
        studentId: enrollment.studentId,
        studentName: enrollment.studentName,
        email: enrollment.email,
        chapters: chaptersProgress,
      };
    });

    return {
      batchId,
      batchName: batchInfo.batchName,
      trackId: batchInfo.trackId,
      trackName: null, // Could join tracks if needed
      students,
    };
  }

  async evaluateStudent(input: { studentId: string; chapterId: number; proficiencyLevel: number; notes?: string; evaluatedBy: string; batchId?: number }) {
    const { studentProgress } = await import('@shared/schema');
    const { and } = await import('drizzle-orm');

    // Check if progress record exists
    const existing = await db
      .select()
      .from(studentProgress)
      .where(and(
        eq(studentProgress.studentId, input.studentId),
        eq(studentProgress.chapterId, input.chapterId)
      ))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      const [updated] = await db
        .update(studentProgress)
        .set({
          proficiencyLevel: input.proficiencyLevel,
          notes: input.notes ?? null,
          lastEvaluatedAt: new Date(),
          evaluatedBy: input.evaluatedBy,
          updatedAt: new Date(),
        })
        .where(eq(studentProgress.id, existing[0].id))
        .returning();
      return updated;
    } else {
      // Create new progress record
      const [created] = await db
        .insert(studentProgress)
        .values({
          studentId: input.studentId,
          chapterId: input.chapterId,
          batchId: input.batchId ?? null,
          proficiencyLevel: input.proficiencyLevel,
          notes: input.notes ?? null,
          lastEvaluatedAt: new Date(),
          evaluatedBy: input.evaluatedBy,
        })
        .returning();
      return created;
    }
  }

  async chapterExists(chapterId: number) {
    const { chapters } = await import('@shared/schema');
    const rows = await db.select({ id: chapters.id }).from(chapters).where(eq(chapters.id, chapterId));
    return !!rows[0];
  }
}

export const batchStorage = new BatchStorage();
