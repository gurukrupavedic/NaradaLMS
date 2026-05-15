// Batch & Cohort shared types

export interface BatchCreateInput {
	orgId: string;
	batchCode: string;
	batchName: string;
	trackId?: number;
	primaryInstructorId?: string;
	cohortType?: string; // 'brahmacharya' | 'grihastha'
	description?: string | null;
	createdBy: string;
	secondaryInstructorIds?: string[];
}

export interface BatchUpdateInput {
	batchCode?: string;
	batchName?: string;
	trackId?: number | null;
	primaryInstructorId?: string | null;
	cohortType?: string | null; // 'brahmacharya' | 'grihastha'
	description?: string | null;
}

export interface BatchDetail {
	id: number;
	orgId: string;
	batchCode: string;
	batchName: string;
	trackId: number | null;
	primaryInstructorId: string | null;
	cohortType: string | null;
	description?: string | null;
	createdAt: Date | null;
	updatedAt: Date | null;
	createdBy: string;
	studentCount?: number;
	track?: { id: number; title: string | null; name: string | null } | null;
	primaryInstructor?: { id: string; firstName: string | null; lastName: string | null; email: string } | null;
	coInstructors: { id: number; instructorId: string; role: string; firstName: string | null; lastName: string | null; email: string | null }[];
}

export interface EnrollmentCreateInput {
	orgId: string;
	batchId: number;
	studentId: string;
	enrolledBy: string;
}

export interface EnrollmentDropInput {
	orgId: string;
	enrollmentId: number;
	droppedBy: string;
	droppedReason?: string;
}

export interface CoInstructorAssignInput {
	orgId: string;
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
