'use client';

import React, { useState } from "react";
import {
    ColumnDef,
    SortingState,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable
} from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Button,
    Input,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DataTablePagination,
    Badge
} from "@narada/ui";
import { MoreVertical, RefreshCw, Search, X } from "lucide-react";

import { useMyStudents, StudentSummary } from "@/lib/hooks/useMyStudents";
import { useBatches } from "@/lib/hooks/useBatches";

export default function InstructorStudentList() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [search, setSearch] = useState("");
    const [selectedBatchId, setSelectedBatchId] = useState<string>("");
    const [selectedStatus, setSelectedStatus] = useState<string>("");

    // Debounced search could be added here, but for now simple state passing
    const offset = (page - 1) * limit;

    const { data: batchesData } = useBatches({ limit: 100, endpoint: '/batches/my-batches' });
    const batches = batchesData?.items || [];

    const { data, isLoading, error, refetch, isRefetching } = useMyStudents({
        limit,
        offset,
        search: search || undefined,
        batchId: selectedBatchId ? Number(selectedBatchId) : undefined,
        status: selectedStatus as any || undefined
    });

    const students = data?.items ?? [];
    const pagination = data?.pagination;
    const total = pagination?.total ?? students.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const columns: ColumnDef<StudentSummary>[] = [
        {
            accessorKey: "firstName",
            header: "NAME",
            cell: ({ row }) => {
                const s = row.original;
                const name = s.firstName || s.lastName ? `${s.firstName} ${s.lastName}`.trim() : s.email;
                return (
                    <div className="flex flex-col">
                        <span className="font-medium">{name}</span>
                        {/* <span className="text-xs text-muted-foreground">{s.email}</span> */}
                    </div>
                );
            }
        },
        {
            accessorKey: "email",
            header: "EMAIL",
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>
        },
        {
            accessorKey: "batchCode",
            header: "BATCH",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span>{row.original.batchCode}</span>
                    <span className="text-xs text-muted-foreground">{row.original.batchName}</span>
                </div>
            )
        },
        {
            accessorKey: "enrollmentDate",
            header: "ENROLLED",
            cell: ({ row }) => {
                if (!row.original.enrolledAt) return <span className="text-muted-foreground">—</span>;
                return new Date(row.original.enrolledAt).toLocaleDateString();
            }
        },
        {
            accessorKey: "status",
            header: "STATUS",
            cell: ({ row }) => {
                const status = row.original.status;
                let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";

                if (status === 'active') variant = "default";
                else if (status === 'dropped') variant = "destructive";
                else if (status === 'completed') variant = "outline";

                return <Badge variant={variant} className="capitalize">{status}</Badge>;
            }
        },
        {
            id: "actions",
            header: "ACTIONS",
            cell: ({ row }) => {
                const student = row.original;
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
                                <Link href={`/instructor/students/${student.id}`}>View Details</Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    const table = useReactTable({
        data: students,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="flex flex-1 gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search students..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <select
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={selectedBatchId}
                        onChange={(e) => setSelectedBatchId(e.target.value)}
                    >
                        <option value="">All Batches</option>
                        {batches.map(b => (
                            <option key={b.id} value={b.id}>{b.batchCode}</option>
                        ))}
                    </select>

                    <select
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="dropped">Dropped</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>

                <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
                </Button>
            </div>

            {/* Table */}
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
                        ) : students.length === 0 ? (
                            <TableRow><TableCell colSpan={columns.length} className="text-center h-24">No students found.</TableCell></TableRow>
                        ) : (
                            table.getRowModel().rows.map(row => (
                                <TableRow
                                    key={row.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => router.push(`/instructor/students/${row.original.id}`)}
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
