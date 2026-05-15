import { db } from "../../db";
import { eq, sql, and, inArray, or, getTableColumns } from "drizzle-orm";
import { batches, enrollments, batchCoInstructors, users, userOrganizations, tracks, studentProgress, chapters, proficiencyEvaluationLog } from "@narada/types";
import type { BatchCreateInput, BatchUpdateInput, EnrollmentCreateInput, EnrollmentDropInput, CoInstructorAssignInput } from "./types";
import {
  getPostgresConstraintName,
  isPostgresUniqueViolation,
} from "../../shared/utils/postgres-unique-violation";

const BATCH_CO_INSTRUCTOR_UNIQ = "batch_co_instructors_batch_instructor_uniq";

function throwIfCoInstructorDuplicate(error: unknown): void {
  if (
    isPostgresUniqueViolation(error) &&
    getPostgresConstraintName(error) === BATCH_CO_INSTRUCTOR_UNIQ
  ) {
    throw Object.assign(
      new Error("Instructor is already assigned to this batch"),
      { status: 409, code: "CO_INSTRUCTOR_CONFLICT" }
    );
  }
}

export class BatchStorage {
  async listBatchesPaginated(limit: number, offset: number, orgId: string): Promise<{ items: any[]; total: number }> {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(batches)
      .where(eq(batches.orgId, orgId));
    const total = Number(countResult?.count ?? 0);

    const items = await db
      .select({
        ...getTableColumns(batches),
        studentCount: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${enrollments.status} = 'active'), 0)::int`,
      })
      .from(batches)
      .leftJoin(enrollments, eq(enrollments.batchId, batches.id))
      .where(eq(batches.orgId, orgId))
      .groupBy(batches.id)
      .orderBy(batches.createdAt)
      .limit(limit)
      .offset(offset);

    return { items, total };
  }

  async listInstructorBatches(instructorId: string, orgId: string) {
    // Get all co-instructor batch IDs for this user
    const coInstructorBatches = await db
      .select({ batchId: batchCoInstructors.batchId })
      .from(batchCoInstructors)
      .innerJoin(batches, eq(batches.id, batchCoInstructors.batchId))
      .where(
        and(
          eq(batchCoInstructors.instructorId, instructorId),
          eq(batches.orgId, orgId)
        )
      );

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
        ...getTableColumns(batches),
        studentCount: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${enrollments.status} = 'active'), 0)::int`,
        primaryInstructorFirstName: users.firstName,
        primaryInstructorLastName: users.lastName,
        trackName: tracks.title,
        trackOrder: tracks.sortOrder,
      })
      .from(batches)
      .leftJoin(enrollments, eq(enrollments.batchId, batches.id))
      .leftJoin(users, eq(users.id, batches.primaryInstructorId))
      .leftJoin(tracks, eq(tracks.id, batches.trackId))
      .where(and(whereCondition, eq(batches.orgId, orgId)))
      .groupBy(batches.id, users.id, tracks.id)
      .orderBy(batches.createdAt);

    // OPTIMIZATION: Eliminate N+1 Query
    // Fetch ALL co-instructors for these batches in one query
    const fetchedBatchIds = batchRows.map(b => b.id);
    let allCoInstructors: { batchId: number; firstName: string | null; lastName: string | null }[] = [];

    if (fetchedBatchIds.length > 0) {
      allCoInstructors = await db
        .select({
          batchId: batchCoInstructors.batchId,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(batchCoInstructors)
        .leftJoin(users, eq(users.id, batchCoInstructors.instructorId))
        .where(inArray(batchCoInstructors.batchId, fetchedBatchIds));
    }

    // Map co-instructors to batches in memory
    return batchRows.map((batch) => {
      const batchCoInstructorsList = allCoInstructors.filter(ci => ci.batchId === batch.id);

      const coInstructorNames = batchCoInstructorsList
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
    });
  }

  async getBatchById(id: number, orgId: string) {
    const baseRows = await db
      .select({
        ...getTableColumns(batches),
        studentCount: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${enrollments.status} = 'active'), 0)::int`,
      })
      .from(batches)
      .leftJoin(enrollments, eq(enrollments.batchId, batches.id))
      .where(and(eq(batches.id, id), eq(batches.orgId, orgId)))
      .groupBy(batches.id);

    const base = baseRows[0];
    if (!base) return null;

    const track = base.trackId
      ? (await db
        .select({ id: tracks.id, title: tracks.title, name: tracks.title, sortOrder: tracks.sortOrder })
        .from(tracks)
        .where(and(eq(tracks.id, base.trackId), eq(tracks.orgId, orgId))))[0] || null
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

    const primaryInstructorName = primaryInstructor
      ? `${primaryInstructor.firstName || ''} ${primaryInstructor.lastName || ''}`.trim() || primaryInstructor.email
      : null;

    const coInstructorNames = coInstructors.length > 0
      ? coInstructors.map(c => `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email).join(', ')
      : null;

    return {
      ...base,
      track,
      primaryInstructor,
      primaryInstructorName,
      coInstructors,
      coInstructorNames,
    };
  }

  async createBatch(input: BatchCreateInput) {
    // Persist batch and optional co-instructor assignments atomically
    const result = await db.transaction(async (tx) => {
      const [created] = await tx.insert(batches).values({
        orgId: input.orgId,
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

  async updateBatch(id: number, orgId: string, input: BatchUpdateInput) {
    const [updated] = await db.update(batches).set({
      batchCode: input.batchCode ?? undefined,
      batchName: input.batchName ?? undefined,
      trackId: input.trackId === undefined ? undefined : input.trackId,
      primaryInstructorId: input.primaryInstructorId === undefined ? undefined : input.primaryInstructorId,
      cohortType: input.cohortType === undefined ? undefined : input.cohortType,
      description: input.description === undefined ? undefined : input.description,
      updatedAt: new Date(),
    }).where(and(eq(batches.id, id), eq(batches.orgId, orgId))).returning();
    return updated;
  }

  async deleteBatch(id: number, orgId: string) {
    // Check for active enrollments
    const activeEnrollments = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.batchId, id),
          eq(enrollments.orgId, orgId),
          eq(enrollments.status, 'active')
        )
      );

    if (activeEnrollments.length > 0) {
      throw Object.assign(
        new Error(`Cannot delete batch with ${activeEnrollments.length} active student(s). Remove all students first.`),
        { status: 400 }
      );
    }

    // Delete the batch (cascade will handle co-instructors and dropped enrollments)
    const [deleted] = await db
      .delete(batches)
      .where(and(eq(batches.id, id), eq(batches.orgId, orgId)))
      .returning();
    return deleted;
  }

  async addEnrollment(input: EnrollmentCreateInput) {
    // Create the enrollment record
    const [created] = await db.insert(enrollments).values({
      orgId: input.orgId,
      batchId: input.batchId,
      studentId: input.studentId,
      status: 'active',
      enrolledBy: input.enrolledBy,
    }).returning();

    // Automatically create proficiency records ONLY for chapters the student doesn't have yet
    try {
      const allChapters = await db
        .select({ id: chapters.id })
        .from(chapters)
        .where(and(eq(chapters.orgId, input.orgId), sql`${chapters.deletedAt} IS NULL`));

      if (allChapters.length > 0) {
        // Check which chapters the student already has proficiency records for
        const existingProgress = await db
          .select({ chapterId: studentProgress.chapterId })
          .from(studentProgress)
          .where(
            and(
              eq(studentProgress.studentId, input.studentId),
              eq(studentProgress.orgId, input.orgId)
            )
          );

        const existingChapterIds = new Set(existingProgress.map(p => p.chapterId));

        // Only create records for NEW chapters (preserves progress when student changes batches)
        const newChapters = allChapters.filter(ch => !existingChapterIds.has(ch.id));

        if (newChapters.length > 0) {
          const proficiencyRecords = newChapters.map(chapter => ({
            orgId: input.orgId,
            studentId: input.studentId,
            chapterId: chapter.id,
            batchId: null,  // Batch-agnostic: proficiency is global per student per chapter
            proficiencyLevel: 9, // Not Started
            lastEvaluatedAt: new Date(),
          }));

          // Bulk insert proficiency records
          await db.insert(studentProgress).values(proficiencyRecords);
        }
      }
    } catch (error) {
      // Log error but don't fail enrollment if proficiency creation fails
      console.error('Warning: Failed to create proficiency records for new enrollment:', error);
    }

    return created;
  }

  async dropEnrollment(input: EnrollmentDropInput) {
    const [updated] = await db.update(enrollments).set({
      status: 'dropped',
      droppedAt: new Date(),
      droppedReason: input.droppedReason ?? null,
      updatedAt: new Date(),
    }).where(
      and(
        eq(enrollments.id, input.enrollmentId),
        eq(enrollments.orgId, input.orgId)
      )
    ).returning();
    return updated;
  }

  async listEnrollmentsByBatch(batchId: number, orgId: string) {
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
        eq(enrollments.orgId, orgId),
        eq(enrollments.status, 'active') // Only show active enrollments, hide dropped students
      ));
  }

  async getActiveEnrollmentForStudent(studentId: string, orgId: string) {
    const [enrollment] = await db
      .select({
        id: enrollments.id,
        batchId: enrollments.batchId,
        orgId: enrollments.orgId,
        studentId: enrollments.studentId,
        status: enrollments.status,
        enrolledAt: enrollments.enrolledAt,
      })
      .from(enrollments)
      .where(and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.orgId, orgId),
        eq(enrollments.status, 'active')
      ))
      .limit(1);
    return enrollment || null;
  }

  async listEligibleStudents(batchId: number, orgId: string, searchQuery?: string) {
    // Get the batch to check primary instructor
    const batch = await this.getBatchById(batchId, orgId);
    const primaryInstructorId = batch?.primaryInstructorId;

    // Limit eligibility to active enrollments within the current org.
    const enrolled = await db
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(and(eq(enrollments.orgId, orgId), eq(enrollments.status, 'active')));

    const enrolledIds = enrolled.map(e => e.studentId);

    // Eligible students are driven by active org memberships, not legacy account roles/status.
    const allEligible = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(userOrganizations)
      .innerJoin(users, eq(users.id, userOrganizations.userId))
      .where(
        and(
          eq(userOrganizations.orgId, orgId),
          eq(userOrganizations.status, "active"),
          sql`'student' = ANY(${userOrganizations.roles})`
        )
      );

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
    try {
      const [created] = await db.insert(batchCoInstructors).values({
        batchId: input.batchId,
        instructorId: input.instructorId,
        role: input.role ?? 'co_instructor',
        assignedBy: input.assignedBy,
      }).returning();
      return created;
    } catch (e) {
      throwIfCoInstructorDuplicate(e);
      throw e;
    }
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
    try {
      return await db.transaction(async (tx) => {
      const current = await tx
        .select({ id: batchCoInstructors.id, instructorId: batchCoInstructors.instructorId })
        .from(batchCoInstructors)
        .where(eq(batchCoInstructors.batchId, batchId));

      const existingIds = new Set(current.map(c => c.instructorId));
      const nextIds = new Set(instructorIds);

      const toAdd = Array.from(nextIds).filter(id => !existingIds.has(id));
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
    } catch (e) {
      throwIfCoInstructorDuplicate(e);
      throw e;
    }
  }

  // Basic existence checks for foreign keys
  async userExists(userId: string) {
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
    return !!rows[0];
  }

  async trackExists(trackId: number, orgId: string) {
    const rows = await db
      .select({ id: tracks.id })
      .from(tracks)
      .where(and(eq(tracks.id, trackId), eq(tracks.orgId, orgId)));
    return !!rows[0];
  }

  async getBatchProgress(batchId: number, orgId: string) {
    // Get batch info
    const batchInfo = await this.getBatchById(batchId, orgId);
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
        eq(enrollments.orgId, orgId),
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

    // Get all chapters (across all tracks) so proficiency can be tracked for chapters in any track
    const chaptersList = await db
      .select({
        chapterId: chapters.id,
        chapterTitle: chapters.title,
        chapterNumber: chapters.sortOrder,
      })
      .from(chapters)
      .where(and(eq(chapters.orgId, orgId), sql`${chapters.deletedAt} IS NULL`))
      .orderBy(chapters.sortOrder);

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
          eq(studentProgress.orgId, orgId),
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

  async evaluateStudent(orgId: string, input: { studentId: string; chapterId: number; proficiencyLevel: number; notes?: string; evaluatedBy: string; batchId?: number }) {
    // Query by (studentId, chapterId) only - batch-agnostic
    // A student should have exactly ONE proficiency record per chapter
    const existing = await db
      .select()
      .from(studentProgress)
      .where(and(
        eq(studentProgress.studentId, input.studentId),
        eq(studentProgress.chapterId, input.chapterId)
      ))
      .limit(1);

    let result;
    const oldProficiency = existing[0]?.proficiencyLevel ?? null;

    if (existing.length > 0) {
      // Update existing record
      [result] = await db
        .update(studentProgress)
        .set({
          orgId,
          proficiencyLevel: input.proficiencyLevel,
          notes: input.notes ?? null,
          lastEvaluatedAt: new Date(),
          evaluatedBy: input.evaluatedBy,
          batchId: null,  // Remove batch dependency - proficiency is global
          updatedAt: new Date(),
        })
        .where(eq(studentProgress.id, existing[0].id))
        .returning();
    } else {
      // Create new record
      [result] = await db
        .insert(studentProgress)
        .values({
          orgId,
          studentId: input.studentId,
          chapterId: input.chapterId,
          batchId: null,  // Batch-agnostic
          proficiencyLevel: input.proficiencyLevel,
          notes: input.notes ?? null,
          lastEvaluatedAt: new Date(),
          evaluatedBy: input.evaluatedBy,
        })
        .returning();
    }

    // Create audit log entry (track which batch the instructor evaluated from)
    await db.insert(proficiencyEvaluationLog).values({
      orgId,
      studentId: input.studentId,
      chapterId: input.chapterId,
      batchId: input.batchId ?? null,  // Current batch for audit purposes
      instructorId: input.evaluatedBy,
      oldProficiencyLevel: oldProficiency,
      newProficiencyLevel: input.proficiencyLevel,
      notes: input.notes ?? null,
    });

    return result;
  }

  async chapterExists(chapterId: number, orgId: string) {
    const rows = await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(
        and(
          eq(chapters.id, chapterId),
          eq(chapters.orgId, orgId),
          sql`${chapters.deletedAt} IS NULL`
        )
      );
    return !!rows[0];
  }

  async listStudentsByInstructor(
    instructorId: string,
    orgId: string,
    filters?: {
      search?: string;
      batchId?: number;
      status?: 'active' | 'dropped' | 'completed';
    }
  ) {
    // Get all co-instructor batch IDs for this user
    const coInstructorBatches = await db
      .select({ batchId: batchCoInstructors.batchId })
      .from(batchCoInstructors)
      .innerJoin(batches, eq(batches.id, batchCoInstructors.batchId))
      .where(
        and(
          eq(batchCoInstructors.instructorId, instructorId),
          eq(batches.orgId, orgId)
        )
      );

    const coInstructorBatchIds = coInstructorBatches.map(row => row.batchId);

    // Build the WHERE condition - user is primary OR co-instructor
    let batchWhereCondition: any;
    if (coInstructorBatchIds.length > 0) {
      batchWhereCondition = or(
        eq(batches.primaryInstructorId, instructorId),
        inArray(batches.id, coInstructorBatchIds)
      );
    } else {
      batchWhereCondition = eq(batches.primaryInstructorId, instructorId);
    }

    // Build filter conditions
    const filterConditions: any[] = [batchWhereCondition, eq(batches.orgId, orgId)];

    // Status filter (default to 'active' if not specified)
    const statusFilter = filters?.status || 'active';
    filterConditions.push(eq(enrollments.status, statusFilter));

    // Batch ID filter
    if (filters?.batchId) {
      filterConditions.push(eq(batches.id, filters.batchId));
    }

    // Search filter (firstName, lastName, email)
    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      filterConditions.push(
        or(
          sql`LOWER(${users.firstName}) LIKE LOWER(${searchPattern})`,
          sql`LOWER(${users.lastName}) LIKE LOWER(${searchPattern})`,
          sql`LOWER(${users.email}) LIKE LOWER(${searchPattern})`
        )
      );
    }

    // Query: enrollments → students + batches, filtered by instructor's batches
    const results = await db
      .select({
        id: users.id,
        rollNumber: enrollments.id, // Will be formatted as BATCH_CODE-XXX in service layer
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        batchId: batches.id,
        batchCode: batches.batchCode,
        batchName: batches.batchName,
        enrolledAt: enrollments.enrolledAt,
        status: enrollments.status,
      })
      .from(enrollments)
      .innerJoin(users, eq(users.id, enrollments.studentId))
      .innerJoin(batches, eq(batches.id, enrollments.batchId))
      .where(and(...filterConditions))
      .orderBy(enrollments.enrolledAt);

    return results;
  }
}

export const batchStorage = new BatchStorage();
