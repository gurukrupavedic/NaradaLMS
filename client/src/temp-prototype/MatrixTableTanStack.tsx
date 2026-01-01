import React, { useMemo } from "react";
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Student, Chapter, ProgressRecord, ProficiencyLevel } from "./MatrixTable";

// --- Props ---
interface MatrixTableProps {
    students: Student[];
    chapters: Chapter[];
    progressData: ProgressRecord[];
    onCellClick: (studentId: string, chapterId: string) => void;
}

// --- Color Utility (Duplicated for availability) ---
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

export const MatrixTableTanStack: React.FC<MatrixTableProps> = ({
    students,
    chapters,
    progressData,
    onCellClick,
}) => {
    const columnHelper = createColumnHelper<Student>();

    const columns = useMemo(() => {
        // 1. Static Student Name Column
        const studentCol = columnHelper.accessor("name", {
            header: "Student Name",
            id: "studentName",
            cell: (info) => {
                const student = info.row.original;
                return (
                    <div className="flex items-center gap-3">
                        <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${student.avatarColor}`}
                        >
                            {student.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div className="font-medium text-gray-900">{student.name}</div>
                    </div>
                );
            },
        });

        // 2. Dynamic Chapter Columns
        // Since we need access to `progressData` inside the cell, but `columns`
        // is memoized, we rely on the component re-rendering when `progressData` changes.
        // However, TanStack table is smart. We can just use the indices or map directly.
        // NOTE: In a real complex app, we might join data. Here we look it up.
        const chapterCols = chapters.map((chapter) =>
            columnHelper.display({
                id: chapter.id,
                header: () => (
                    <div className="text-center w-full">
                        <div className="text-xs font-bold text-gray-500 uppercase">
                            {chapter.code}
                        </div>
                        <div
                            className="text-sm font-medium text-gray-900 truncate w-24 mx-auto"
                            title={chapter.title}
                        >
                            {chapter.title}
                        </div>
                    </div>
                ),
                cell: (info) => {
                    const student = info.row.original;
                    const record = progressData.find(
                        (p) => p.studentId === student.id && p.chapterId === chapter.id
                    );
                    const level = record?.proficiency || 0;
                    const status = record?.status || "not_started";

                    return (
                        <div className="w-full h-full p-1 relative group">
                            <button
                                onClick={() => onCellClick(student.id, chapter.id)}
                                className={cn(
                                    "w-full h-12 rounded flex items-center justify-center transition-all duration-200 border",
                                    getCellColor(level, status)
                                )}
                            >
                                <span className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                    {status === 'absent'
                                        ? 'Abs'
                                        : level > 0
                                            ? `L${level}`
                                            : status === "practicing"
                                                ? "Prac"
                                                : ""}
                                </span>
                            </button>
                        </div>
                    );
                },
            })
        );

        return [studentCol, ...chapterCols];
    }, [chapters, progressData, onCellClick]); // Re-create columns if data changes

    const table = useReactTable({
        data: students,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="max-w-[1600px] mx-auto bg-white rounded-lg shadow border overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header, index) => {
                                    const isFirst = index === 0;
                                    return (
                                        <th
                                            key={header.id}
                                            className={cn(
                                                "border-b border-r bg-gray-50",
                                                isFirst
                                                    ? "sticky left-0 z-20 p-4 text-left min-w-[250px] font-semibold text-gray-700"
                                                    : "min-w-[120px] p-2"
                                            )}
                                        >
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                {row.getVisibleCells().map((cell, index) => {
                                    const isFirst = index === 0;
                                    return (
                                        <td
                                            key={cell.id}
                                            className={cn(
                                                "border-b border-r",
                                                isFirst
                                                    ? "sticky left-0 z-10 bg-white p-3 hover:bg-gray-50 transition-colors"
                                                    : "p-0" // Using p-0 because padding is handled by inner div in cell renderer
                                            )}
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
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
