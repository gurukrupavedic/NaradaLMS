import { batchStorage } from "./storage";
import type { BatchCreateInput, BatchUpdateInput, EnrollmentCreateInput, EnrollmentDropInput, CoInstructorAssignInput, BatchDetail } from "./types";

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

    return batchStorage.createBatch(input);
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

    return batchStorage.updateBatch(id, input);
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

    return batchStorage.addEnrollment(input);
  }

  async dropEnrollment(input: EnrollmentDropInput) {
    return batchStorage.dropEnrollment(input);
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

    return batchStorage.assignCoInstructor(input);
  }

  async removeCoInstructor(assignmentId: number) {
    return batchStorage.removeCoInstructor(assignmentId);
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
    const { VALID_PROFICIENCY_LEVELS } = await import('@shared/constants');
    
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

    return batchStorage.evaluateStudent(input);
  }
}

export const batchService = new BatchService();
