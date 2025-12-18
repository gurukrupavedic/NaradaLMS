import { db } from "../../db";
import { eq } from "drizzle-orm";
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
}

export const batchStorage = new BatchStorage();
