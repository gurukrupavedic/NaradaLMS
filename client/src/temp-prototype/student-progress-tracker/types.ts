import { ProficiencyLevel } from '@/new-ui/batches/types/matrix';

export interface Student {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    rollNumber: string;
    batchCode: string;
    batchName: string;
    enrolledAt: string; // ISO Date string
}

export interface ChapterProgress {
    chapterId: number;
    chapterOrder: number;
    chapterTitle: string;
    chapterCode: string; // e.g. "CH1" - helpful for UI
    proficiencyLevel: ProficiencyLevel;
    lastEvaluatedAt: string | null; // ISO Date string
    evaluatedBy: string | null;
    notes: string | null;
}

export interface TrackProgress {
    trackId: number;
    trackOrder: number;
    trackTitle: string;
    trackDescription: string;
    completedChapters: number;
    totalChapters: number;
    chapters: ChapterProgress[];
}

export interface StudentProgressData {
    student: Student;
    trackProgress: TrackProgress[];
}
