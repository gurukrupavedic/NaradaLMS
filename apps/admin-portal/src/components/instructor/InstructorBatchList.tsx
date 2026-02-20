'use client';

import React, { useState, useRef, useCallback } from "react";
import {
    ColumnDef,
    Column,
    SortingState,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { useBatches, Batch } from "@/lib/hooks/useBatches";
import { useCoInstructors, useInstructors, Instructor } from "@/lib/hooks/useBatchRelations";
import { Button } from "@narada/ui";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    VirtualizedTableBody,
} from "@narada/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@narada/ui";
import { DataTablePagination } from "@narada/ui";
import { MoreVertical, ArrowUpDown, AlertCircle, Layers, Users } from "lucide-react";
import { apiRequest } from "@/lib/api";

// --- Components ---

function CoInstructorCell({ batchId, instructors }: { batchId: number; instructors: Instructor[] }) {
    const { data, isLoading, error } = useCoInstructors(batchId);
    if (isLoading) return <span className="text-muted-foreground">Loading…</span>;
    if (error) return <span className="text-muted-foreground">—</span>;
    const items = Array.isArray(data) ? data : [];
    if (items.length === 0) return <span className="text-muted-foreground">—</span>;

    const unique = new Map<string, (typeof items)[number]>();
    for (const ci of items) {
        if (!unique.has(ci.instructorId)) unique.set(ci.instructorId, ci);
    }
    const labels = Array.from(unique.values()).map((ci) => {
        const nameFromApi =
            ci.firstName && ci.lastName ? `${ci.firstName} ${ci.lastName}` : undefined;
        if (nameFromApi) return nameFromApi;
        const inst = instructors.find((i) => i.id === ci.instructorId);
        return inst
            ? inst.firstName && inst.lastName
                ? `${inst.firstName} ${inst.lastName}`
                : inst.email
              : ci.instructorId;
    });
    const joined = labels.join(", ");
    return (
        <span className="min-w-0 truncate block text-foreground" title={joined}>
            {joined}
        </span>
    );
}

// --- Supporting Types ---

type Track = { id: number; title?: string; name?: string };

function SortableHeader({ column, label }: { column: Column<Batch>; label: string }) {
    return (
        <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 hover:text-foreground transition-colors -ml-1 px-1"
            aria-label={`Sort by ${label}`}
        >
            {label}
            <ArrowUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </button>
    );
}

export default function InstructorBatchList() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [sorting, setSorting] = useState<SortingState>([]);
    const offset = (page - 1) * limit;

    const { data, isLoading, error, refetch } = useBatches({
        limit,
        offset,
        endpoint: "/batches/my-batches",
    });
    const { data: instructors = [] } = useInstructors();

    const [tracks, setTracks] = useState<Track[]>([]);
    React.useEffect(() => {
        apiRequest<Track[]>("/learning/tracks")
            .then((data) => setTracks(data || []))
            .catch(() => setTracks([]));
    }, []);

    const batches = data?.items ?? [];
    const pagination = data?.pagination;
    const total = pagination?.total ?? batches.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const columns: ColumnDef<Batch>[] = [
        {
            accessorKey: "batchCode",
            header: ({ column }) => <SortableHeader column={column} label="Code" />,
            cell: ({ row }) => (
                <span
                    className="min-w-0 truncate block font-mono text-xs bg-muted/30 rounded px-1.5 py-0.5"
                    title={row.original.batchCode}
                >
                    {row.original.batchCode}
                </span>
            ),
        },
        {
            accessorKey: "batchName",
            header: ({ column }) => <SortableHeader column={column} label="Name" />,
            cell: ({ row }) => (
                <span
                    className="min-w-0 truncate block font-medium text-foreground"
                    title={row.original.batchName}
                >
                    {row.original.batchName}
                </span>
            ),
        },
        {
            accessorKey: "cohortType",
            header: ({ column }) => <SortableHeader column={column} label="Cohort type" />,
            cell: ({ row }) => {
                const type = row.original.cohortType;
                if (!type) return <span className="text-sm text-muted-foreground">—</span>;
                return (
                    <span
                        className="min-w-0 truncate block text-sm text-foreground capitalize"
                        title={type}
                    >
                        {type}
                    </span>
                );
            },
        },
        {
            accessorKey: "trackId",
            header: ({ column }) => <SortableHeader column={column} label="Current track" />,
            cell: ({ row }) => {
                const tid = row.original.trackId;
                if (!tid) return <span className="text-sm text-muted-foreground">—</span>;
                const track = tracks.find((t) => t.id === tid);
                const fullTrackLabel = track
                    ? track.title || track.name || `Track ${tid}`
                    : String(tid);
                return (
                    <span
                        className="min-w-0 truncate block text-sm text-foreground"
                        title={fullTrackLabel}
                    >
                        {fullTrackLabel}
                    </span>
                );
            },
        },
        {
            accessorKey: "primaryInstructorId",
            header: ({ column }) => <SortableHeader column={column} label="Primary instructor" />,
            cell: ({ row }) => {
                const id = row.original.primaryInstructorId;
                const inst = instructors.find((i) => i.id === id);
                const label = inst
                    ? inst.firstName && inst.lastName
                        ? `${inst.firstName} ${inst.lastName}`
                        : inst.email
                    : id ?? null;
                return (
                    <span
                        className={
                            label
                                ? "min-w-0 truncate block text-sm text-foreground"
                                : "text-sm text-muted-foreground"
                        }
                        title={label ?? undefined}
                    >
                        {label ?? "—"}
                    </span>
                );
            },
        },
        {
            id: "secondaryInstructors",
            header: "Secondary instructor(s)",
            cell: ({ row }) => (
                <CoInstructorCell batchId={row.original.id} instructors={instructors} />
            ),
        },
        {
            accessorKey: "studentCount",
            header: ({ column }) => (
                <div className="flex justify-end">
                    <SortableHeader column={column} label="Students" />
                </div>
            ),
            cell: ({ row }) => {
                const n = row.original.studentCount;
                return (
                    <span
                        className={
                            n != null
                                ? "text-sm text-foreground tabular-nums inline-flex items-center justify-end gap-1"
                                : "text-sm text-muted-foreground inline-flex items-center justify-end gap-1"
                        }
                    >
                        {n != null && (
                            <Users className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
                        )}
                        {n != null ? n : "—"}
                    </span>
                );
            },
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => {
                const batch = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => e.stopPropagation()}
                                aria-label="Actions"
                            >
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <Link href={`/instructor/batches/${batch.id}`}>
                                    View Details
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    const table = useReactTable({
        data: batches,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    const tableScrollRef = useRef<HTMLDivElement>(null);
    const rowModel = table.getRowModel().rows;
    const useVirtualized = rowModel.length > 30;
    const columnCount = columns.length;

    const renderTableRow = useCallback(
        (row: (typeof rowModel)[number]) => {
            const href = `/instructor/batches/${row.original.id}`;
            return (
                <TableRow
                    key={row.id}
                    className="bg-card hover:bg-muted/50 border-l-2 border-l-transparent hover:border-l-primary/50 transition-colors"
                >
                    {row.getVisibleCells().map((cell) => {
                        const cellContent =
                            cell.column.id === "batchCode" ? (
                                <Link
                                    href={href}
                                    className="block w-full h-full min-w-0"
                                >
                                    {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext()
                                    )}
                                </Link>
                            ) : (
                                flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                )
                            );
                        const cellClass =
                            cell.column.id === "studentCount"
                                ? "text-right"
                                : cell.column.id === "actions"
                                  ? "whitespace-nowrap text-right"
                                  : undefined;
                        return (
                            <TableCell key={cell.id} className={cellClass}>
                                {cellContent}
                            </TableCell>
                        );
                    })}
                </TableRow>
            );
        },
        []
    );

    return (
        <div className="flex min-h-0 flex-1 flex-col pt-4">
            {isLoading ? (
                <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 text-muted-foreground py-12">
                    <div
                        className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"
                        aria-hidden
                    />
                    <p className="text-sm">Loading batches…</p>
                </div>
            ) : error ? (
                <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 text-destructive py-12">
                    <AlertCircle className="h-8 w-8" aria-hidden />
                    <p className="text-sm">Failed to load batches. Please try again.</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Retry
                    </Button>
                </div>
            ) : batches.length === 0 ? (
                <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-2 text-muted-foreground py-12 max-w-sm text-center">
                    <Layers className="h-10 w-10 opacity-20" aria-hidden />
                    <p className="text-sm font-medium">No batches found</p>
                    <p className="text-sm">You are not assigned to any batches yet.</p>
                </div>
            ) : (
                <>
                    <div className="flex min-h-0 flex-1 flex-col rounded-md border overflow-hidden">
                        <Table
                            className="w-full table-fixed [&_th]:h-9 [&_th]:py-1.5 [&_th]:px-3 [&_td]:py-1.5 [&_td]:px-3 [&_td]:overflow-hidden [&_tr]:h-[52px]"
                            scrollContainerRef={
                                useVirtualized ? tableScrollRef : undefined
                            }
                            scrollContainerStyle={
                                useVirtualized ? { height: 400 } : { height: "100%" }
                            }
                        >
                            <TableHeader className="sticky top-0 z-10 bg-muted [&_tr]:border-b">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead
                                                key={header.id}
                                                className={
                                                    header.column.id === "actions"
                                                        ? "text-right"
                                                        : undefined
                                                }
                                            >
                                                {flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            {useVirtualized ? (
                                <VirtualizedTableBody
                                    rows={rowModel}
                                    renderRow={renderTableRow}
                                    rowHeight={52}
                                    height={400}
                                    columnCount={columnCount}
                                    scrollContainerRef={tableScrollRef}
                                />
                            ) : (
                                <TableBody className="[&_tr]:bg-card">
                                    {rowModel.map((row) => renderTableRow(row))}
                                </TableBody>
                            )}
                        </Table>
                    </div>

                    <DataTablePagination
                        className="shrink-0 py-3 [&_button]:bg-card"
                        currentPage={page}
                        totalPages={totalPages}
                        pageSize={limit}
                        totalRowCount={total}
                        onPageChange={setPage}
                        onPageSizeChange={(size) => {
                            setLimit(size);
                            setPage(1);
                        }}
                    />
                </>
            )}
        </div>
    );
}
