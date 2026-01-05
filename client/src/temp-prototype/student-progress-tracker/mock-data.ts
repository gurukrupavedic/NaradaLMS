import { StudentProgressData } from './types';

export const MOCK_STUDENT_PROGRESS: StudentProgressData = {
    student: {
        id: 'student-123',
        firstName: 'Ramesh',
        lastName: 'Kumar',
        email: 'ramesh.kumar@example.com',
        rollNumber: 'BR01-005',
        batchCode: 'BR01',
        batchName: 'Morning Vedic Recitation',
        enrolledAt: '2025-01-01T00:00:00Z',
    },
    trackProgress: [
        {
            trackId: 101,
            trackOrder: 1,
            trackTitle: 'Rigveda Foundation',
            trackDescription: 'Basic mantras and phonetics',
            completedChapters: 4,
            totalChapters: 10,
            chapters: [
                {
                    chapterId: 1,
                    chapterOrder: 1,
                    chapterTitle: 'Introduction to Rigveda',
                    chapterCode: 'CH1',
                    proficiencyLevel: 3, // Ready
                    lastEvaluatedAt: '2025-12-20T10:30:00Z',
                    evaluatedBy: 'Karan Dutta',
                    notes: 'Excellent pronunciation.',
                },
                {
                    chapterId: 2,
                    chapterOrder: 2,
                    chapterTitle: 'Basics of Swara',
                    chapterCode: 'CH2',
                    proficiencyLevel: 2, // 70%
                    lastEvaluatedAt: '2025-12-15T09:15:00Z',
                    evaluatedBy: 'Karan Dutta',
                    notes: 'Needs work on udalta.',
                },
                {
                    chapterId: 3,
                    chapterOrder: 3,
                    chapterTitle: 'Fundamentals of Chandas',
                    chapterCode: 'CH3',
                    proficiencyLevel: 1, // 50%
                    lastEvaluatedAt: '2025-12-10T14:20:00Z',
                    evaluatedBy: 'Karan Dutta',
                    notes: null,
                },
                {
                    chapterId: 4,
                    chapterOrder: 4,
                    chapterTitle: 'Advanced Concepts',
                    chapterCode: 'CH4',
                    proficiencyLevel: 0, // Practicing
                    lastEvaluatedAt: '2025-12-05T11:45:00Z',
                    evaluatedBy: 'Karan Dutta',
                    notes: 'Just started.',
                },
                {
                    chapterId: 5,
                    chapterOrder: 5,
                    chapterTitle: 'Phonetics Drill',
                    chapterCode: 'CH5',
                    proficiencyLevel: 8, // Absent
                    lastEvaluatedAt: '2025-11-28T10:00:00Z',
                    evaluatedBy: 'Karan Dutta',
                    notes: 'Absent due to illness.',
                },
                {
                    chapterId: 6,
                    chapterOrder: 6,
                    chapterTitle: 'Recitation Practice 1',
                    chapterCode: 'CH6',
                    proficiencyLevel: 9, // Not Started
                    lastEvaluatedAt: null,
                    evaluatedBy: null,
                    notes: null,
                },
                {
                    chapterId: 7,
                    chapterOrder: 7,
                    chapterTitle: 'Recitation Practice 2',
                    chapterCode: 'CH7',
                    proficiencyLevel: 4, // Certified
                    lastEvaluatedAt: '2025-12-25T10:00:00Z',
                    evaluatedBy: 'Karan Dutta',
                    notes: 'Flawless recitation.',
                },
                {
                    chapterId: 8,
                    chapterOrder: 8,
                    chapterTitle: 'Recitation Practice 3',
                    chapterCode: 'CH8',
                    proficiencyLevel: 9,
                    lastEvaluatedAt: null,
                    evaluatedBy: null,
                    notes: null,
                },
                {
                    chapterId: 9,
                    chapterOrder: 9,
                    chapterTitle: 'Final Review',
                    chapterCode: 'CH9',
                    proficiencyLevel: 9,
                    lastEvaluatedAt: null,
                    evaluatedBy: null,
                    notes: null,
                },
                {
                    chapterId: 10,
                    chapterOrder: 10,
                    chapterTitle: 'Assessment',
                    chapterCode: 'CH10',
                    proficiencyLevel: 9,
                    lastEvaluatedAt: null,
                    evaluatedBy: null,
                    notes: null,
                },
            ],
        },
        {
            trackId: 102,
            trackOrder: 2,
            trackTitle: 'Rigveda Intermediate',
            trackDescription: 'Intermediate recitation techniques',
            completedChapters: 0,
            totalChapters: 8,
            chapters: [
                {
                    chapterId: 11,
                    chapterOrder: 1,
                    chapterTitle: 'Intermediate Recitation 1',
                    chapterCode: 'CH1',
                    proficiencyLevel: 1, // 50%
                    lastEvaluatedAt: '2026-01-02T15:30:00Z',
                    evaluatedBy: 'Karan Dutta',
                    notes: '',
                },
                // Fill the rest with Not Started
                ...Array.from({ length: 7 }, (_, i) => ({
                    chapterId: 12 + i,
                    chapterOrder: 2 + i,
                    chapterTitle: `Intermediate Recitation ${2 + i}`,
                    chapterCode: `CH${2 + i}`,
                    proficiencyLevel: 9 as const, // Not Started
                    lastEvaluatedAt: null,
                    evaluatedBy: null,
                    notes: null,
                })),
            ],
        },
        {
            trackId: 103, // A track that has barely started
            trackOrder: 3,
            trackTitle: 'Yajurveda Basics',
            trackDescription: 'Introduction to Yajurveda',
            completedChapters: 0,
            totalChapters: 5,
            chapters: Array.from({ length: 5 }, (_, i) => ({
                chapterId: 20 + i,
                chapterOrder: 1 + i,
                chapterTitle: `Yajurveda Lesson ${1 + i}`,
                chapterCode: `CH${1 + i}`,
                proficiencyLevel: 9 as const,
                lastEvaluatedAt: null,
                evaluatedBy: null,
                notes: null,
            })),
        },
    ],
};
