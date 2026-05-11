import { batchStorage } from "./storage";
import { VALID_PROFICIENCY_LEVELS } from "@narada/types";
import type { BatchCreateInput, BatchUpdateInput, EnrollmentCreateInput, EnrollmentDropInput, CoInstructorAssignInput, BatchDetail } from "./types";
import { eventBus } from "../../shared/events/event-bus";
import { BATCH_EVENTS } from "./events";
import { LEARNING_DELIVERY_EVENTS } from "../learning-delivery/events";
import {
  getPostgresConstraintName,
  isPostgresUniqueViolation,
} from "../../shared/utils/postgres-unique-violation";

const BATCH_CODE_UNIQ = "batches_org_batch_code_uniq";

function throwIfBatchCodeConflict(error: unknown): void {
  if (
    isPostgresUniqueViolation(error) &&
    getPostgresConstraintName(error) === BATCH_CODE_UNIQ
  ) {
    throw Object.assign(new Error("Batch code already in use"), {
      status: 409,
      code: "BATCH_CODE_CONFLICT",
    });
  }
}

export class BatchService {
  async listBatchesPaginated(limit: number, offset: number, orgId: string) {
    return batchStorage.listBatchesPaginated(limit, offset, orgId);
  }

  async listInstructorBatches(instructorId: string, orgId: string) {
    return batchStorage.listInstructorBatches(instructorId, orgId);
  }

  async getBatch(id: number, orgId: string): Promise<BatchDetail | null> {
    return batchStorage.getBatchById(id, orgId);
  }

  async createBatch(input: BatchCreateInput) {
    if (!input.batchCode?.trim() || !input.batchName?.trim()) {
      throw Object.assign(new Error('batchCode and batchName are required'), { status: 400 });
    }

    if (input.trackId !== undefined && input.trackId !== null) {
      const exists = await batchStorage.trackExists(input.trackId, input.orgId);
      if (!exists) throw Object.assign(new Error('Track does not exist'), { status: 400 });
    }

    if (input.primaryInstructorId) {
      const exists = await batchStorage.userExists(input.primaryInstructorId);
      if (!exists) throw Object.assign(new Error('Primary instructor does not exist'), { status: 400 });
    }

    // Validate secondary instructors if provided
    if (input.secondaryInstructorIds && input.secondaryInstructorIds.length > 0) {
      for (const instructorId of input.secondaryInstructorIds) {
        const exists = await batchStorage.userExists(instructorId);
        if (!exists) throw Object.assign(new Error(`Secondary instructor not found: ${instructorId}`), { status: 400 });
      }
    }

    let batch;
    try {
      batch = await batchStorage.createBatch(input);
    } catch (e) {
      throwIfBatchCodeConflict(e);
      throw e;
    }
    eventBus.publish(BATCH_EVENTS.created, {
      batchId: batch.id,
      trackId: batch.trackId ?? undefined,
      createdBy: batch.createdBy ?? 'system',
      timestamp: new Date().toISOString(),
    });
    return batch;
  }

  async updateBatch(id: number, orgId: string, input: BatchUpdateInput) {
    if (input.trackId !== undefined && input.trackId !== null) {
      const exists = await batchStorage.trackExists(input.trackId, orgId);
      if (!exists) throw Object.assign(new Error('Track does not exist'), { status: 400 });
    }

    if (input.primaryInstructorId) {
      const exists = await batchStorage.userExists(input.primaryInstructorId);
      if (!exists) throw Object.assign(new Error('Primary instructor does not exist'), { status: 400 });
    }

    let updated;
    try {
      updated = await batchStorage.updateBatch(id, orgId, input);
    } catch (e) {
      if (input.batchCode !== undefined && input.batchCode !== null) {
        throwIfBatchCodeConflict(e);
      }
      throw e;
    }
    if (updated) {
      eventBus.publish(BATCH_EVENTS.updated, {
        batchId: id,
        trackId: updated.trackId ?? undefined,
        timestamp: new Date().toISOString(),
      });
    }
    return updated;
  }

  async deleteBatch(id: number, orgId: string) {
    const batch = await this.getBatch(id, orgId);
    if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });
    return batchStorage.deleteBatch(id, orgId);
  }

  async syncCoInstructors(batchId: number, instructorIds: string[], assignedBy: string) {
    // Validate all instructor IDs exist
    for (const instructorId of instructorIds) {
      const exists = await batchStorage.userExists(instructorId);
      if (!exists) throw Object.assign(new Error(`Instructor not found: ${instructorId}`), { status: 400 });
    }
    return batchStorage.syncCoInstructors(batchId, instructorIds, assignedBy);
  }

  async addEnrollment(input: EnrollmentCreateInput) {
    // ONE-TO-MANY CONSTRAINT: Check if student already has an active enrollment
    const existingEnrollment = await batchStorage.getActiveEnrollmentForStudent(input.studentId);
    if (existingEnrollment) {
      throw Object.assign(
        new Error(`Student is already enrolled in batch ${existingEnrollment.batchId}`),
        { status: 400, code: 'ALREADY_ENROLLED', details: { batchId: existingEnrollment.batchId } }
      );
    }

    const batch = await this.getBatch(input.batchId, input.orgId);
    if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });

    const studentExists = await batchStorage.userExists(input.studentId);
    if (!studentExists) throw Object.assign(new Error('Student not found'), { status: 400 });

    const created = await batchStorage.addEnrollment(input);
    eventBus.publish(BATCH_EVENTS.enrollmentAdded, {
      batchId: input.batchId,
      studentId: input.studentId,
      enrolledBy: input.enrolledBy,
      timestamp: new Date().toISOString(),
    });
    return created;
  }

  async dropEnrollment(input: EnrollmentDropInput) {
    const updated = await batchStorage.dropEnrollment(input);
    if (updated) {
      eventBus.publish(BATCH_EVENTS.enrollmentDropped, {
        batchId: updated.batchId,
        studentId: updated.studentId,
        timestamp: new Date().toISOString(),
      });
    }
    return updated;
  }

  async listEnrollments(batchId: number, orgId: string) {
    return batchStorage.listEnrollmentsByBatch(batchId, orgId);
  }

  async listEligibleStudents(batchId: number, orgId: string, searchQuery?: string) {
    return batchStorage.listEligibleStudents(batchId, orgId, searchQuery);
  }

  async assignCoInstructor(input: CoInstructorAssignInput) {
    const batch = await this.getBatch(input.batchId, input.orgId);
    if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });

    const instructorExists = await batchStorage.userExists(input.instructorId);
    if (!instructorExists) throw Object.assign(new Error('Instructor not found'), { status: 400 });

    const created = await batchStorage.assignCoInstructor(input);
    eventBus.publish(BATCH_EVENTS.coInstructorAssigned, {
      batchId: input.batchId,
      instructorId: input.instructorId,
      timestamp: new Date().toISOString(),
    });
    return created;
  }

  async removeCoInstructor(assignmentId: number) {
    const removed = await batchStorage.removeCoInstructor(assignmentId);
    if (removed) {
      eventBus.publish(BATCH_EVENTS.coInstructorRemoved, {
        batchId: removed.batchId,
        instructorId: removed.instructorId,
        timestamp: new Date().toISOString(),
      });
    }
    return removed;
  }

  async listCoInstructors(batchId: number, orgId: string) {
    const batch = await this.getBatch(batchId, orgId);
    if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });
    return batchStorage.listCoInstructorsByBatch(batchId);
  }

  // Phase 5: Evaluation methods
  async getBatchProgress(batchId: number, orgId: string) {
    const batch = await this.getBatch(batchId, orgId);
    if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });

    return batchStorage.getBatchProgress(batchId, orgId);
  }

  async evaluateStudent(orgId: string, input: { studentId: string; chapterId: number; proficiencyLevel: number; notes?: string; evaluatedBy: string; batchId?: number }) {
    // Validate proficiency level
    if (!VALID_PROFICIENCY_LEVELS.includes(input.proficiencyLevel as any)) {
      throw Object.assign(
        new Error(`Invalid proficiency level. Must be one of: ${VALID_PROFICIENCY_LEVELS.join(', ')}`),
        { status: 400 }
      );
    }

    // Validate student exists
    const studentExists = await batchStorage.userExists(input.studentId);
    if (!studentExists) throw Object.assign(new Error('Student not found'), { status: 400 });

    // Validate chapter exists
    const chapterExists = await batchStorage.chapterExists(input.chapterId, orgId);
    if (!chapterExists) throw Object.assign(new Error('Chapter not found'), { status: 400 });

    // If batchId provided, validate batch exists
    if (input.batchId) {
      const batch = await this.getBatch(input.batchId, orgId);
      if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });
    }

    const result = await batchStorage.evaluateStudent(orgId, input);
    eventBus.publish(LEARNING_DELIVERY_EVENTS.PROGRESS_UPDATED, {
      studentId: input.studentId,
      chapterId: input.chapterId,
      proficiencyLevel: input.proficiencyLevel,
      timestamp: new Date().toISOString(),
    });
    return result;
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
    const rawStudents = await batchStorage.listStudentsByInstructor(instructorId, orgId, filters);

    // Format roll number as BATCH_CODE-XXX (using enrollment ID)
    // IMPORTANT: Maintain backward compatibility with monolith frontend
    // The monolith expects 'id' to be the User ID (string), not enrollment ID
    return rawStudents.map((student) => ({
      id: student.id, // User ID (preserves monolith compatibility)
      rollNumber: `${student.batchCode}-${String(student.rollNumber).padStart(3, '0')}`,
      name: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
      email: student.email || '-',
      phone: '-', // Placeholder for future use
      timezone: '-', // Placeholder for future use
      type: '-', // Placeholder for future use
      batchId: student.batchId, // Safe addition - monolith can ignore
      batchCode: student.batchCode,
      batchName: student.batchName,
      enrolledAt: student.enrolledAt, // Keep original field name
      status: student.status, // Safe addition - monolith can ignore
      // Optional fields for admin-portal (monolith ignores these)
      firstName: student.firstName,
      lastName: student.lastName,
    }));
  }
}

export const batchService = new BatchService();
