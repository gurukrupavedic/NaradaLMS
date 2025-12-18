// Batch & Cohort shared types

export interface BatchCreateInput {
	batchCode: string;
	batchName: string;
	trackId?: number;
	primaryInstructorId?: string;
	createdBy: string;
}

export interface BatchUpdateInput {
	batchCode?: string;
	batchName?: string;
	trackId?: number | null;
	primaryInstructorId?: string | null;
	status?: 'active' | 'completed' | 'archived';
}

export interface EnrollmentCreateInput {
	batchId: number;
	studentId: string;
	enrolledBy: string;
}

export interface EnrollmentDropInput {
	enrollmentId: number;
	droppedReason?: string;
}

export interface CoInstructorAssignInput {
	batchId: number;
	instructorId: string;
	role?: 'co_instructor' | 'ta';
	assignedBy: string;
}

export interface CoInstructorRemoveInput {
	assignmentId: number;
}
