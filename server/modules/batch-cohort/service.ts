import { batchStorage } from "./storage";
import type { BatchCreateInput, BatchUpdateInput, EnrollmentCreateInput, EnrollmentDropInput, CoInstructorAssignInput } from "./types";

export class BatchService {
  async listBatches() {
    return batchStorage.listBatches();
  }

  async getBatch(id: number) {
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

  async addEnrollment(input: EnrollmentCreateInput) {
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
}

export const batchService = new BatchService();
