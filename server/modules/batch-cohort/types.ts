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

// Student evaluation (Phase 5)
export interface StudentEvaluationInput {
	studentId: string;
	chapterId: number;
	proficiencyLevel: number; // 0-4, 8, 9
	notes?: string;
	evaluatedBy: string;
	batchId?: number;
}

// Batch progress view (Phase 5)
export interface BatchProgressDTO {
	batchId: number;
	batchName: string;
	trackId: number | null;
	trackName: string | null;
	students: StudentProgressInBatch[];
}

export interface StudentProgressInBatch {
	studentId: string;
	studentName: string;
	email: string;
	chapters: ChapterProgressItem[];
}

export interface ChapterProgressItem {
	chapterId: number;
	chapterTitle: string;
	chapterNumber: number;
	proficiencyLevel: number | null;
	lastAccessed: Date | null;
	lastEvaluatedAt: Date | null;
	evaluatedBy: string | null;
	notes: string | null;
}
