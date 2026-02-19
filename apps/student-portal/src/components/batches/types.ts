export type ProficiencyLevel = 0 | 1 | 2 | 3 | 4 | 8 | 9;

export interface StudentMatrixRow {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    enrollmentId: number;
}

export interface Chapter {
    id: string;
    code: string;
    title: string;
    trackId: string;
}

export interface StudentProgress {
    studentId: string;
    chapterId: string;
    proficiencyLevel: ProficiencyLevel;
    status: "practicing" | "completed" | "absent" | "not_started";
    lastEvaluatedAt: string | null;
    evaluatedBy: string | null;
    notes: string | null;
}

export interface Track {
    id: string;
    name: string;
    code: string;
    description?: string;
    order: number;
}

export interface UnifiedBatchMatrixProps {
    students: StudentMatrixRow[];
    chapters: Chapter[];
    progress: StudentProgress[];
    selectedBatchId: string;
    selectedTrackId: string;
    onDropStudent: (enrollmentId: number) => Promise<void>;
    onUpdateProficiency: (
        studentId: string,
        chapterId: string,
        level: ProficiencyLevel,
        notes?: string
    ) => Promise<void>;
    isLoading?: boolean;
    isUpdating?: boolean;
    canEditProficiency?: boolean;
}

export interface MatrixEvaluationModalProps {
    isOpen: boolean;
    student?: StudentMatrixRow;
    chapter?: Chapter;
    currentProficiency?: ProficiencyLevel;
    onClose: () => void;
    onUpdate: (level: ProficiencyLevel, notes?: string) => Promise<void>;
    isUpdating?: boolean;
    isError?: boolean;
    errorMessage?: string;
}

export interface MatrixCell {
    studentId: string;
    chapterId: string;
    proficiencyLevel: ProficiencyLevel;
    status: "practicing" | "completed" | "absent" | "not_started";
    isEmpty: boolean;
}
