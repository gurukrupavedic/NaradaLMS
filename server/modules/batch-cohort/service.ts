import { batchStorage } from "./storage";
import { VALID_PROFICIENCY_LEVELS } from "@narada/types";
import type { BatchCreateInput, BatchUpdateInput, EnrollmentCreateInput, EnrollmentDropInput, CoInstructorAssignInput, BatchDetail } from "./types";
import { eventBus } from "../../shared/events/event-bus";
import { BATCH_EVENTS } from "./events";
import { LEARNING_DELIVERY_EVENTS } from "../learning-delivery/events";

export class BatchService {
  async listBatches() {
    return batchStorage.listBatches();
  }

  async listInstructorBatches(instructorId: string) {
    return batchStorage.listInstructorBatches(instructorId);
  }

  async getBatch(id: number): Promise<BatchDetail | null> {
    return batchStorage.getBatchById(id);
  }

  async createBatch(input: BatchCreateInput) {
    if (!input.batchCode?.trim() || !input.batchName?.trim()) {
      throw Object.assign(new Error('batchCode and batchName are required'), { status: 400 });
    }

    if (input.trackId !== undefined && input.trackId !== null) {
      const exists = await batchStorage.trackExists(input.trackId);
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

    const batch = await batchStorage.createBatch(input);
    eventBus.publish(BATCH_EVENTS.created, {
      batchId: batch.id,
      trackId: batch.trackId ?? undefined,
      createdBy: batch.createdBy ?? 'system',
      timestamp: new Date().toISOString(),
    });
    return batch;
  }

  async updateBatch(id: number, input: BatchUpdateInput) {
    if (input.trackId !== undefined && input.trackId !== null) {
      const exists = await batchStorage.trackExists(input.trackId);
      if (!exists) throw Object.assign(new Error('Track does not exist'), { status: 400 });
    }

    if (input.primaryInstructorId) {
      const exists = await batchStorage.userExists(input.primaryInstructorId);
      if (!exists) throw Object.assign(new Error('Primary instructor does not exist'), { status: 400 });
    }

    const updated = await batchStorage.updateBatch(id, input);
    if (updated) {
      eventBus.publish(BATCH_EVENTS.updated, {
        batchId: id,
        trackId: updated.trackId ?? undefined,
        timestamp: new Date().toISOString(),
      });
    }
    return updated;
  }

  async deleteBatch(id: number) {
    const batch = await this.getBatch(id);
    if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });
    return batchStorage.deleteBatch(id);
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

    const batch = await this.getBatch(input.batchId);
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

  async listEnrollments(batchId: number) {
    return batchStorage.listEnrollmentsByBatch(batchId);
  }

  async listEligibleStudents(batchId: number, searchQuery?: string) {
    return batchStorage.listEligibleStudents(batchId, searchQuery);
  }

  async assignCoInstructor(input: CoInstructorAssignInput) {
    const batch = await this.getBatch(input.batchId);
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

  async listCoInstructors(batchId: number) {
    return batchStorage.listCoInstructorsByBatch(batchId);
  }

  // Phase 5: Evaluation methods
  async getBatchProgress(batchId: number) {
    const batch = await this.getBatch(batchId);
    if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });

    return batchStorage.getBatchProgress(batchId);
  }

  async evaluateStudent(input: { studentId: string; chapterId: number; proficiencyLevel: number; notes?: string; evaluatedBy: string; batchId?: number }) {
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
    const chapterExists = await batchStorage.chapterExists(input.chapterId);
    if (!chapterExists) throw Object.assign(new Error('Chapter not found'), { status: 400 });

    // If batchId provided, validate batch exists
    if (input.batchId) {
      const batch = await this.getBatch(input.batchId);
      if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });
    }

    const result = await batchStorage.evaluateStudent(input);
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
    filters?: {
      search?: string;
      batchId?: number;
      status?: 'active' | 'dropped' | 'completed';
    }
  ) {
    const rawStudents = await batchStorage.listStudentsByInstructor(instructorId, filters);

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
      // Optional fields for ops-portal (monolith ignores these)
      firstName: student.firstName,
      lastName: student.lastName,
    }));
  }
}

export const batchService = new BatchService();
