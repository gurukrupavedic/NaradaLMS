import React from "react";
import { cn } from "@/lib/utils";

// --- Types (Re-exported for consistency) ---
export type ProficiencyLevel = -1 | 0 | 1 | 2 | 3 | 4;

export interface Student {
    id: string;
    name: string;
    avatarColor: string;
}

export interface Chapter {
    id: string;
    code: string;
    title: string;
}

export interface ProgressRecord {
    studentId: string;
    chapterId: string;
    status: 'not_started' | 'practicing' | 'completed' | 'absent';
    proficiency: ProficiencyLevel;
    lastUpdated?: string;
}

// --- Props ---
interface MatrixTableProps {
    students: Student[];
    chapters: Chapter[];
    progressData: ProgressRecord[];
    onCellClick: (studentId: string, chapterId: string) => void;
}

// --- Color Utility ---
const getCellColor = (level: ProficiencyLevel, status: string) => {
    if (status === 'absent') return "bg-gray-300 hover:bg-gray-400 border-gray-400 text-gray-700";
    if (status === 'practicing') return "bg-yellow-200 hover:bg-yellow-300 border-yellow-300";
    if (level === 0) return "bg-white hover:bg-gray-50 border-gray-200";
    if (level === 1) return "bg-green-200 hover:bg-green-300 border-green-300";
    if (level === 2) return "bg-green-500 hover:bg-green-600 border-green-600 text-white";
    if (level === 3) return "bg-purple-300 hover:bg-purple-400 border-purple-400";
    if (level === 4) return "bg-purple-600 hover:bg-purple-700 border-purple-700 text-white";
    return "bg-gray-50";
};

export const MatrixTable: React.FC<MatrixTableProps> = ({
    students,
    chapters,
    progressData,
    onCellClick
}) => {
    return (
        <div className="max-w-[1600px] mx-auto bg-white rounded-lg shadow border overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="sticky left-0 z-20 bg-gray-50 border-b border-r p-4 text-left min-w-[250px] font-semibold text-gray-700">
                                Student Name
                            </th>
                            {chapters.map(chapter => (
                                <th key={chapter.id} className="border-b border-r min-w-[120px] p-2 text-center bg-gray-50">
                                    <div className="text-xs font-bold text-gray-500 uppercase">{chapter.code}</div>
                                    <div className="text-sm font-medium text-gray-900 truncate w-24 mx-auto" title={chapter.title}>
                                        {chapter.title}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {students.map(student => (
                            <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                <td className="sticky left-0 z-10 bg-white border-b border-r p-3 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${student.avatarColor}`}>
                                            {student.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div className="font-medium text-gray-900">{student.name}</div>
                                    </div>
                                </td>

                                {chapters.map(chapter => {
                                    const record = progressData.find(p => p.studentId === student.id && p.chapterId === chapter.id);
                                    const level = record?.proficiency || 0;
                                    const status = record?.status || 'not_started';

                                    return (
                                        <td key={chapter.id} className="border-b border-r p-1 relative group">
                                            <button
                                                onClick={() => onCellClick(student.id, chapter.id)}
                                                className={cn(
                                                    "w-full h-12 rounded flex items-center justify-center transition-all duration-200 border",
                                                    getCellColor(level, status)
                                                )}
                                            >
                                                <span className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {status === 'absent' ? 'Abs' : level > 0 ? `L${level}` : status === 'practicing' ? 'Prac' : ''}
                                                </span>
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
