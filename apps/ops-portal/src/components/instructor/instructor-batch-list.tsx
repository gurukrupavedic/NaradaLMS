'use client';
import React, { useState } from "react";
import { ColumnDef, SortingState, flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
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
} from "@narada/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@narada/ui";
import { DataTablePagination } from "@narada/ui";
import { MoreVertical, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

// --- Components ---

function CoInstructorCell({ batchId, instructors }: { batchId: number; instructors: Instructor[] }) {
    const { data, isLoading, error } = useCoInstructors(batchId);
    if (isLoading) return <span className="text-muted-foreground">Loading…</span>;
    if (error) return <span className="text-muted-foreground">—</span>;
    const items = Array.isArray(data) ? data : [];
    if (items.length === 0) return <span className="text-muted-foreground">—</span>;

    const unique = new Map<string, typeof items[number]>();
    for (const ci of items) {
        if (!unique.has(ci.instructorId)) unique.set(ci.instructorId, ci);
    }
    const labels = Array.from(unique.values()).map(ci => {
        const nameFromApi = (ci.firstName && ci.lastName) ? `${ci.firstName} ${ci.lastName}` : undefined;
        if (nameFromApi) return nameFromApi;
        const inst = instructors.find(i => i.id === ci.instructorId);
        return inst ? ((inst.firstName && inst.lastName) ? `${inst.firstName} ${inst.lastName}` : inst.email) : ci.instructorId;
    });
    return <span className="text-foreground">{labels.join(", ")}</span>;
}

// --- Supporting Types ---

type Track = { id: number; title?: string; name?: string };

export default function InstructorBatchList() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [sorting, setSorting] = useState<SortingState>([]);
    const offset = (page - 1) * limit;

    // Data fetching
    // Use the instructor specific endpoint
    const { data, isLoading, error, refetch, isRefetching } = useBatches({
        limit,
        offset,
        endpoint: '/batches/my-batches'
    });
    const { data: instructors = [] } = useInstructors();

    // Fetch Tracks for the dropdown/display
    const [tracks, setTracks] = useState<Track[]>([]);
    React.useEffect(() => {
        apiRequest<Track[]>("/learning/tracks")
            .then(data => setTracks(data || []))
            .catch(() => setTracks([]));
    }, []);

    const batches = data?.items ?? [];
    const pagination = data?.pagination;
    const total = pagination?.total ?? batches.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const columns: ColumnDef<Batch>[] = [
        {
            accessorKey: "batchCode",
            header: "CODE",
            cell: ({ row }) => <span className="font-medium">{row.original.batchCode}</span>,
        },
        {
            accessorKey: "batchName",
            header: "NAME",
        },
        {
            accessorKey: "cohortType",
            header: "COHORT TYPE",
            cell: ({ row }) => {
                const type = row.original.cohortType;
                if (!type) return <span className="text-muted-foreground">—</span>;
                return <span className="capitalize">{type}</span>;
            }
        },
        {
            accessorKey: "trackId",
            header: "CURRENT TRACK",
            cell: ({ row }) => {
                const tid = row.original.trackId;
                if (!tid) return <span className="text-muted-foreground">—</span>;
                const track = tracks.find(t => t.id === tid);
                return <span>{track ? (track.title || track.name || `Track ${tid}`) : tid}</span>;
            }
        },
        {
            accessorKey: "primaryInstructorId",
            header: "PRIMARY INSTRUCTOR",
            cell: ({ row }) => {
                const id = row.original.primaryInstructorId;
                const inst = instructors.find(i => i.id === id);
                return inst ? `${inst.firstName} ${inst.lastName}` : id || '-';
            }
        },
        {
            id: "secondaryInstructors",
            header: "SECONDARY INSTRUCTOR(S)",
            cell: ({ row }) => <CoInstructorCell batchId={row.original.id} instructors={instructors} />
        },
        {
            accessorKey: "studentCount",
            header: "STUDENTS",
        },
        {
            id: "actions",
            header: "ACTIONS",
            cell: ({ row }) => {
                const batch = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <Link href={`/instructor/batches/${batch.id}`}>View Details</Link>
                            </DropdownMenuItem>
                            {/* Instructors cannot edit/delete batches per requirements */}
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

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
                </Button>
                {/* No Create Batch button for instructors */}
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <TableHead key={header.id}>
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={columns.length} className="text-center h-24">Loading...</TableCell></TableRow>
                        ) : batches.length === 0 ? (
                            <TableRow><TableCell colSpan={columns.length} className="text-center h-24">No batches found.</TableCell></TableRow>
                        ) : (
                            table.getRowModel().rows.map(row => (
                                <TableRow
                                    key={row.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => router.push(`/instructor/batches/${row.original.id}`)}
                                >
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <DataTablePagination
                currentPage={page}
                totalPages={totalPages}
                pageSize={limit}
                onPageChange={setPage}
                onPageSizeChange={setLimit}
            />
        </div>
    );
}
