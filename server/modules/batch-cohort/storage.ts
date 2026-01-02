import { db } from "../../db";
import { eq, sql, and, inArray, or } from "drizzle-orm";
import { batches, enrollments, batchCoInstructors, users, tracks, studentProgress, chapters } from "@shared/schema";
import type { BatchCreateInput, BatchUpdateInput, EnrollmentCreateInput, EnrollmentDropInput, CoInstructorAssignInput } from "./types";

export class BatchStorage {
  async listBatches() {
    return db
      .select({
        ...batches,
        studentCount: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${enrollments.status} = 'active'), 0)::int`,
      })
      .from(batches)
      .leftJoin(enrollments, eq(enrollments.batchId, batches.id))
      .groupBy(batches.id)
      .orderBy(batches.createdAt);
  }

  async listInstructorBatches(instructorId: string) {
    // Get all co-instructor batch IDs for this user
    const coInstructorBatches = await db
      .select({ batchId: batchCoInstructors.batchId })
      .from(batchCoInstructors)
      .where(eq(batchCoInstructors.instructorId, instructorId));
    
    const coInstructorBatchIds = coInstructorBatches.map(row => row.batchId);

    // Build the WHERE condition
    let whereCondition: any;
    if (coInstructorBatchIds.length > 0) {
      whereCondition = or(
        eq(batches.primaryInstructorId, instructorId),
        inArray(batches.id, coInstructorBatchIds)
      );
    } else {
      whereCondition = eq(batches.primaryInstructorId, instructorId);
    }

    const batchRows = await db
      .select({
        ...batches,
        studentCount: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${enrollments.status} = 'active'), 0)::int`,
        primaryInstructorFirstName: users.firstName,
        primaryInstructorLastName: users.lastName,
        trackName: tracks.title,
      })
      .from(batches)
      .leftJoin(enrollments, eq(enrollments.batchId, batches.id))
      .leftJoin(users, eq(users.id, batches.primaryInstructorId))
      .leftJoin(tracks, eq(tracks.id, batches.trackId))
      .where(whereCondition)
      .groupBy(batches.id, users.id, tracks.id)
      .orderBy(batches.createdAt);

    // Enrich with instructor names and co-instructors
    return Promise.all(
      batchRows.map(async (batch) => {
        const coInstructors = await db
          .select({
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(batchCoInstructors)
          .leftJoin(users, eq(users.id, batchCoInstructors.instructorId))
          .where(eq(batchCoInstructors.batchId, batch.id));

        const coInstructorNames = coInstructors
          .filter(ci => ci.firstName && ci.lastName)
          .map(ci => `${ci.firstName} ${ci.lastName}`)
          .join(", ");

        const primaryInstructorName = batch.primaryInstructorFirstName && batch.primaryInstructorLastName
          ? `${batch.primaryInstructorFirstName} ${batch.primaryInstructorLastName}`
          : null;

        // Remove the individual name fields and add the combined name
        const { primaryInstructorFirstName, primaryInstructorLastName, ...rest } = batch;

        return {
          ...rest,
          primaryInstructorName,
          coInstructorNames: coInstructorNames || null,
        };
      })
    );
  }

  async getBatchById(id: number) {
    const baseRows = await db
      .select({
        ...batches,
        studentCount: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${enrollments.status} = 'active'), 0)::int`,
      })
      .from(batches)
      .leftJoin(enrollments, eq(enrollments.batchId, batches.id))
      .where(eq(batches.id, id))
      .groupBy(batches.id);

    const base = baseRows[0];
    if (!base) return null;

    const track = base.trackId
      ? (await db
          .select({ id: tracks.id, title: tracks.title, name: tracks.title, order: tracks.order })
          .from(tracks)
          .where(eq(tracks.id, base.trackId)))[0] || null
      : null;

    const primaryInstructor = base.primaryInstructorId
      ? (await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, base.primaryInstructorId)))[0] || null
      : null;

    const coInstructors = await db
      .select({
        id: batchCoInstructors.id,
        instructorId: batchCoInstructors.instructorId,
        role: batchCoInstructors.role,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(batchCoInstructors)
      .leftJoin(users, eq(users.id, batchCoInstructors.instructorId))
      .where(eq(batchCoInstructors.batchId, id));

    return {
      ...base,
      track,
      primaryInstructor,
      coInstructors,
    };
  }

  async createBatch(input: BatchCreateInput) {
    // Persist batch and optional co-instructor assignments atomically
    const result = await db.transaction(async (tx) => {
      const [created] = await tx.insert(batches).values({
        batchCode: input.batchCode,
        batchName: input.batchName,
        trackId: input.trackId ?? null,
        primaryInstructorId: input.primaryInstructorId ?? null,
        cohortType: input.cohortType ?? null,
        description: input.description ?? null,
        createdBy: input.createdBy,
      }).returning();

      // If secondary instructors provided, assign them to the new batch
      if (input.secondaryInstructorIds && input.secondaryInstructorIds.length > 0) {
        for (const instructorId of input.secondaryInstructorIds) {
          await tx.insert(batchCoInstructors).values({
            batchId: created.id,
            instructorId,
            role: 'co_instructor',
            assignedBy: input.createdBy,
          });
        }
      }

      return created;
    });
    return result;
  }

  async updateBatch(id: number, input: BatchUpdateInput) {
    const [updated] = await db.update(batches).set({
      batchCode: input.batchCode ?? undefined,
      batchName: input.batchName ?? undefined,
      trackId: input.trackId === undefined ? undefined : input.trackId,
      primaryInstructorId: input.primaryInstructorId === undefined ? undefined : input.primaryInstructorId,
      cohortType: input.cohortType === undefined ? undefined : input.cohortType,
      description: input.description === undefined ? undefined : input.description,
      updatedAt: new Date(),
    }).where(eq(batches.id, id)).returning();
    return updated;
  }

  async deleteBatch(id: number) {
    // Check for active enrollments
    const activeEnrollments = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.batchId, id), eq(enrollments.status, 'active')));

    if (activeEnrollments.length > 0) {
      throw Object.assign(
        new Error(`Cannot delete batch with ${activeEnrollments.length} active student(s). Remove all students first.`),
        { status: 400 }
      );
    }

    // Delete the batch (cascade will handle co-instructors and dropped enrollments)
    const [deleted] = await db.delete(batches).where(eq(batches.id, id)).returning();
    return deleted;
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
    return db
      .select({
        id: enrollments.id,
        batchId: enrollments.batchId,
        studentId: enrollments.studentId,
        status: enrollments.status,
        enrolledAt: enrollments.enrolledAt,
        droppedAt: enrollments.droppedAt,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(enrollments)
      .leftJoin(users, eq(users.id, enrollments.studentId))
      .where(and(
        eq(enrollments.batchId, batchId),
        eq(enrollments.status, 'active') // Only show active enrollments, hide dropped students
      ));
  }

  async getActiveEnrollmentForStudent(studentId: string) {
    const [enrollment] = await db
      .select({
        id: enrollments.id,
        batchId: enrollments.batchId,
        studentId: enrollments.studentId,
        status: enrollments.status,
        enrolledAt: enrollments.enrolledAt,
      })
      .from(enrollments)
      .where(and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.status, 'active')
      ))
      .limit(1);
    return enrollment || null;
  }

  async listEligibleStudents(batchId: number, searchQuery?: string) {
    // Get the batch to check primary instructor
    const batch = await this.getBatchById(batchId);
    const primaryInstructorId = batch?.primaryInstructorId;

    // ONE-TO-MANY CONSTRAINT: Get ALL students with active enrollments (in any batch)
    // A student can only enroll in ONE batch, so exclude all currently enrolled students
    const enrolled = await db
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(eq(enrollments.status, 'active')); // Removed batchId filter - exclude all enrolled students
    
    const enrolledIds = enrolled.map(e => e.studentId);

    // Build query for eligible students
    let query = db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        roles: users.roles,
      })
      .from(users)
      .where(
        and(
          sql`${users.status} = 'active'`,
          sql`'student' = ANY(${users.roles})`
        )
      );

    // Execute and filter
    const allEligible = await query;
    
    // Exclude already enrolled students
    let filtered = allEligible.filter(u => !enrolledIds.includes(u.id));

    // Exclude primary instructor (students can be co-instructors, but not primary instructor)
    if (primaryInstructorId) {
      filtered = filtered.filter(u => u.id !== primaryInstructorId);
    }

    // Apply search filter
    if (searchQuery && searchQuery.trim()) {
      const search = searchQuery.toLowerCase();
      filtered = filtered.filter(u => {
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        const email = (u.email || '').toLowerCase();
        return fullName.includes(search) || email.includes(search);
      });
    }

    return filtered;
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
    // Include instructor name/email for display purposes
    return db
      .select({
        id: batchCoInstructors.id,
        batchId: batchCoInstructors.batchId,
        instructorId: batchCoInstructors.instructorId,
        role: batchCoInstructors.role,
        assignedAt: batchCoInstructors.assignedAt,
        assignedBy: batchCoInstructors.assignedBy,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(batchCoInstructors)
      .leftJoin(users, eq(users.id, batchCoInstructors.instructorId))
      .where(eq(batchCoInstructors.batchId, batchId));
  }

  async syncCoInstructors(batchId: number, instructorIds: string[], assignedBy: string) {
    return db.transaction(async (tx) => {
      const current = await tx
        .select({ id: batchCoInstructors.id, instructorId: batchCoInstructors.instructorId })
        .from(batchCoInstructors)
        .where(eq(batchCoInstructors.batchId, batchId));

      const existingIds = new Set(current.map(c => c.instructorId));
      const nextIds = new Set(instructorIds);

      const toAdd = [...nextIds].filter(id => !existingIds.has(id));
      const toRemove = current.filter(c => !nextIds.has(c.instructorId)).map(c => c.id);

      // Remove assignments no longer present
      if (toRemove.length > 0) {
        await tx
          .delete(batchCoInstructors)
          .where(and(eq(batchCoInstructors.batchId, batchId), inArray(batchCoInstructors.id, toRemove)));
      }
      // If next list is empty, ensure we remove any remaining (edge cases)
      if (instructorIds.length === 0 && current.length > 0) {
        await tx.delete(batchCoInstructors).where(eq(batchCoInstructors.batchId, batchId));
      }

      // Add new assignments
      if (toAdd.length > 0) {
        await tx.insert(batchCoInstructors).values(
          toAdd.map(instructorId => ({
            batchId,
            instructorId,
            role: 'co_instructor',
            assignedBy,
          }))
        );
      }

      // Return the new list
      return tx
        .select()
        .from(batchCoInstructors)
        .where(eq(batchCoInstructors.batchId, batchId));
    });
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

  async getBatchProgress(batchId: number) {
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
          chapterNumber: chapters.order,
        })
        .from(chapters)
        .where(eq(chapters.trackId, batchInfo.trackId))
        .orderBy(chapters.order);
    }

    // Get student IDs for progress query
    const studentIds = enrollmentsList.map(e => e.studentId);
    const chapterIds = chaptersList.map(c => c.chapterId);

    // Get all progress records for these students/chapters
    let progressRecords: any[] = [];
    if (chapterIds.length > 0 && studentIds.length > 0) {
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
    const rows = await db.select({ id: chapters.id }).from(chapters).where(eq(chapters.id, chapterId));
    return !!rows[0];
  }
}

export const batchStorage = new BatchStorage();
