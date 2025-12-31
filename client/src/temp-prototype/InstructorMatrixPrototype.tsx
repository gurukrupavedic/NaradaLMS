import React, { useState } from "react";
import { Button } from "@/components/design-system/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MatrixTable, ProficiencyLevel, Student, Chapter, ProgressRecord } from "./MatrixTable";
import { MatrixTableTanStack } from "./MatrixTableTanStack";

// --- Mock Data Generator ---
const MOCK_CHAPTERS: Chapter[] = Array.from({ length: 12 }, (_, i) => ({
  id: `c_${i + 1}`,
  code: `T1.${i + 1}`,
  title: `Chapter ${i + 1}: ${['Invocation', 'Ganapati Prarthana', 'Shanti Mantra', 'Narayana Suktam', 'Medha Suktam'][i % 5]}`
}));

const MOCK_STUDENTS: Student[] = [
  { id: 's_1', name: "Arjun Kumar", avatarColor: "bg-blue-100 text-blue-700" },
  { id: 's_2', name: "Priya Sharma", avatarColor: "bg-purple-100 text-purple-700" },
  { id: 's_3', name: "Vijay Singh", avatarColor: "bg-green-100 text-green-700" },
  { id: 's_4', name: "Ananya R", avatarColor: "bg-amber-100 text-amber-700" },
  { id: 's_5', name: "Rahul D", avatarColor: "bg-indigo-100 text-indigo-700" },
  { id: 's_6', name: "Siva P", avatarColor: "bg-red-100 text-red-700" },
];

const INITIAL_PROGRESS: ProgressRecord[] = [];
// Seed some random progress
MOCK_STUDENTS.forEach(student => {
  MOCK_CHAPTERS.forEach((chapter, idx) => {
    // Randomize
    const rand = Math.random();
    if (idx < 5) {
      if (rand > 0.8) {
        INITIAL_PROGRESS.push({ studentId: student.id, chapterId: chapter.id, status: 'completed', proficiency: 4, lastUpdated: '2 days ago' });
      } else if (rand > 0.5) {
        INITIAL_PROGRESS.push({ studentId: student.id, chapterId: chapter.id, status: 'completed', proficiency: 3, lastUpdated: '1 week ago' });
      } else if (rand > 0.2) {
        INITIAL_PROGRESS.push({ studentId: student.id, chapterId: chapter.id, status: 'completed', proficiency: 2, lastUpdated: '3 weeks ago' });
      } else {
        INITIAL_PROGRESS.push({ studentId: student.id, chapterId: chapter.id, status: 'practicing', proficiency: 0, lastUpdated: 'yesterday' });
      }
    } else if (idx === 5) {
      if (rand > 0.5) INITIAL_PROGRESS.push({ studentId: student.id, chapterId: chapter.id, status: 'practicing', proficiency: 0, lastUpdated: 'today' });
    }
  });
});

export default function InstructorMatrixPrototype() {
  const [progressData, setProgressData] = useState<ProgressRecord[]>(INITIAL_PROGRESS);
  const [selectedCell, setSelectedCell] = useState<{ studentId: string, chapterId: string } | null>(null);

  const handleUpdate = (level: ProficiencyLevel, status: 'completed' | 'practicing' | 'not_started' | 'absent') => {
    if (!selectedCell) return;

    setProgressData(prev => {
      // Remove existing
      const filtered = prev.filter(p => !(p.studentId === selectedCell.studentId && p.chapterId === selectedCell.chapterId));
      if (status === 'not_started') return filtered;

      return [...filtered, {
        studentId: selectedCell.studentId,
        chapterId: selectedCell.chapterId,
        proficiency: level,
        status,
        lastUpdated: 'Just now'
      }];
    });
    setSelectedCell(null);
  };

  const currentCellData = selectedCell
    ? progressData.find(p => p.studentId === selectedCell.studentId && p.chapterId === selectedCell.chapterId)
    : null;

  const currentStudent = selectedCell ? MOCK_STUDENTS.find(s => s.id === selectedCell.studentId) : null;
  const currentChapter = selectedCell ? MOCK_CHAPTERS.find(c => c.id === selectedCell.chapterId) : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <span>My Batches</span>
              <ChevronRight className="h-4 w-4" />
              <span>Morning Cohort</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Morning Cohort - Matrix View</h1>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => window.history.back()}>Back</Button>
            <Button variant="solid" color="indigo">Evaluation Mode</Button>
          </div>
        </div>
      </div>

      {/* Main Grid Area - Using Independent Component */}
      <div className="flex-1 overflow-auto p-6 space-y-8">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Original (HTML Table)</h2>
          <MatrixTable
            students={MOCK_STUDENTS}
            chapters={MOCK_CHAPTERS}
            progressData={progressData}
            onCellClick={(studentId, chapterId) => setSelectedCell({ studentId, chapterId })}
          />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">TanStack Table Version</h2>
          <MatrixTableTanStack
            students={MOCK_STUDENTS}
            chapters={MOCK_CHAPTERS}
            progressData={progressData}
            onCellClick={(studentId, chapterId) => setSelectedCell({ studentId, chapterId })}
          />
        </div>
      </div>

      {/* Evaluation Modal */}
      <Dialog open={!!selectedCell} onOpenChange={(open) => !open && setSelectedCell(null)}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle>Update Progress</DialogTitle>
          </DialogHeader>

          {currentStudent && currentChapter && (
            <div className="space-y-6 py-4">
              <div className="bg-gray-50 p-3 rounded-md border text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-500">Student:</span>
                  <span className="font-medium">{currentStudent.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Chapter:</span>
                  <span className="font-medium">{currentChapter.code} - {currentChapter.title}</span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Select Proficiency Level:</p>

                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handleUpdate(-1, 'absent')}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded border text-left hover:bg-gray-50 transition-colors",
                      currentCellData?.status === 'absent' ? "ring-2 ring-gray-400 border-gray-400 bg-gray-100" : ""
                    )}
                  >
                    <div className="h-4 w-4 rounded-full bg-gray-400" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Absent</div>
                      <div className="text-xs text-gray-500">Student was absent for this session</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleUpdate(0, 'practicing')}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded border text-left hover:bg-gray-50 transition-colors",
                      currentCellData?.status === 'practicing' ? "ring-2 ring-yellow-400 border-yellow-400 bg-yellow-50" : ""
                    )}
                  >
                    <div className="h-4 w-4 rounded-full bg-yellow-400" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Practicing / Attended</div>
                      <div className="text-xs text-gray-500">Student is currently learning this chapter</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleUpdate(1, 'completed')}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded border text-left hover:bg-gray-50 transition-colors",
                      currentCellData?.proficiency === 1 ? "ring-2 ring-green-300 border-green-300 bg-green-50" : ""
                    )}
                  >
                    <div className="h-4 w-4 rounded-full bg-green-300" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Level 1 - 50%</div>
                      <div className="text-xs text-gray-500">Basic recitation capability</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleUpdate(2, 'completed')}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded border text-left hover:bg-gray-50 transition-colors",
                      currentCellData?.proficiency === 2 ? "ring-2 ring-green-600 border-green-600 bg-green-50" : ""
                    )}
                  >
                    <div className="h-4 w-4 rounded-full bg-green-600" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Level 2 - 70%</div>
                      <div className="text-xs text-gray-500">Good flow, minor corrections needed</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleUpdate(3, 'completed')}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded border text-left hover:bg-gray-50 transition-colors",
                      currentCellData?.proficiency === 3 ? "ring-2 ring-purple-400 border-purple-400 bg-purple-50" : ""
                    )}
                  >
                    <div className="h-4 w-4 rounded-full bg-purple-400" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Level 3 - 90% (Ready)</div>
                      <div className="text-xs text-gray-500">Ready for certification exam</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleUpdate(4, 'completed')}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded border text-left hover:bg-gray-50 transition-colors",
                      currentCellData?.proficiency === 4 ? "ring-2 ring-purple-700 border-purple-700 bg-purple-50" : ""
                    )}
                  >
                    <div className="h-4 w-4 rounded-full bg-purple-700" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Level 4 - 95% (Certified)</div>
                      <div className="text-xs text-gray-500">Mastered and certified</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t mt-4 flex justify-between items-center">
                <button
                  onClick={() => handleUpdate(0, 'not_started')}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Reset / Not Started
                </button>
                <span className="text-xs text-gray-400">
                  Changes save locally to this prototype
                </span>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
