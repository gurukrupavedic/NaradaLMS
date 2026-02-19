'use client';

import React, { useState, useRef, useCallback, useEffect } from "react";
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
import {
    Button,
    Input,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    VirtualizedTableBody,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DataTablePagination,
    Badge,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    useToast,
} from "@narada/ui";
import { MoreVertical, ArrowUpDown, AlertCircle, Users, RotateCcw } from "lucide-react";
import { formatDate } from "@shared/utils/date";

import { useMyStudents, StudentSummary } from "@/lib/hooks/useMyStudents";
import { useBatches } from "@/lib/hooks/useBatches";

function SortableHeader({
    column,
    label,
}: {
    column: Column<StudentSummary>;
    label: string;
}) {
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

export default function InstructorStudentList() {
    const { toast } = useToast();
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    const offset = (page - 1) * limit;

    const { data: batchesData } = useBatches({ limit: 100, endpoint: "/batches/my-batches" });
    const batches = batchesData?.items || [];

    const { data, isLoading, error, refetch } = useMyStudents({
        limit,
        offset,
        search: debouncedSearch || undefined,
        batchId: selectedBatchId && selectedBatchId !== "all" ? Number(selectedBatchId) : undefined,
        status:
            selectedStatus && selectedStatus !== "all"
                ? (selectedStatus as "active" | "dropped" | "completed")
                : undefined,
    });

    const students = data?.items ?? [];
    const pagination = data?.pagination;
    const total = pagination?.total ?? students.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const hasActiveFilters =
        searchInput.trim() !== "" || selectedBatchId !== "all" || selectedStatus !== "all";

    const resetFilters = () => {
        setSearchInput("");
        setSelectedBatchId("all");
        setSelectedStatus("all");
        setPage(1);
        toast({ title: "Filters reset" });
    };

    const columns: ColumnDef<StudentSummary>[] = [
        {
            accessorKey: "firstName",
            header: ({ column }) => <SortableHeader column={column} label="Name" />,
            cell: ({ row }) => {
                const s = row.original;
                const name =
                    s.firstName || s.lastName
                        ? `${s.firstName} ${s.lastName}`.trim()
                        : s.email;
                return (
                    <span
                        className="min-w-0 truncate block font-medium text-foreground"
                        title={name}
                    >
                        {name}
                    </span>
                );
            },
        },
        {
            accessorKey: "email",
            header: ({ column }) => <SortableHeader column={column} label="Email" />,
            cell: ({ row }) => (
                <span
                    className="min-w-0 truncate block text-sm text-muted-foreground"
                    title={row.original.email}
                >
                    {row.original.email}
                </span>
            ),
        },
        {
            accessorKey: "batchCode",
            header: ({ column }) => <SortableHeader column={column} label="Batch" />,
            cell: ({ row }) => (
                <div className="flex flex-col min-w-0">
                    <span className="truncate block" title={row.original.batchCode}>
                        {row.original.batchCode}
                    </span>
                    <span
                        className="text-xs text-muted-foreground truncate block"
                        title={row.original.batchName}
                    >
                        {row.original.batchName}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: "enrollmentDate",
            header: ({ column }) => <SortableHeader column={column} label="Enrolled" />,
            cell: ({ row }) => {
                if (!row.original.enrolledAt)
                    return <span className="text-muted-foreground">—</span>;
                return formatDate(row.original.enrolledAt);
            },
        },
        {
            accessorKey: "status",
            header: ({ column }) => <SortableHeader column={column} label="Status" />,
            cell: ({ row }) => {
                const status = row.original.status;
                let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
                if (status === "active") variant = "default";
                else if (status === "dropped") variant = "destructive";
                else if (status === "completed") variant = "outline";
                return <Badge variant={variant} className="capitalize">{status}</Badge>;
            },
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => {
                const student = row.original;
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
                                <Link href={`/instructor/students/${student.id}`}>
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
        data: students,
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
            const href = `/instructor/students/${row.original.id}`;
            return (
                <TableRow
                    key={row.id}
                    className="bg-card hover:bg-muted/50 border-l-2 border-l-transparent hover:border-l-primary/50 transition-colors"
                >
                    {row.getVisibleCells().map((cell) => {
                        const cellContent =
                            cell.column.id === "firstName" ? (
                                <Link href={href} className="block w-full h-full min-w-0">
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
                            cell.column.id === "actions"
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
        <div className="flex min-h-0 flex-1 flex-col">
            <div
                className="flex flex-shrink-0 flex-wrap items-center gap-3 py-3"
                role="group"
                aria-label="Student filters"
            >
                <Input
                    type="search"
                    placeholder="Search students…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="h-9 w-[200px] shrink-0 bg-card"
                    aria-label="Search students"
                />

                <Select
                    value={selectedBatchId}
                    onValueChange={(value) => {
                        setSelectedBatchId(value);
                        setPage(1);
                    }}
                >
                    <SelectTrigger
                        className="h-9 w-[140px] shrink-0 bg-card"
                        aria-label="Filter by batch"
                    >
                        <SelectValue placeholder="Batch" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Batches</SelectItem>
                        {batches.map((b) => (
                            <SelectItem key={b.id} value={String(b.id)}>
                                {b.batchCode}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={selectedStatus}
                    onValueChange={(value) => {
                        setSelectedStatus(value);
                        setPage(1);
                    }}
                >
                    <SelectTrigger
                        className="h-9 w-[140px] shrink-0 bg-card"
                        aria-label="Filter by status"
                    >
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="dropped">Dropped</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                </Select>

                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetFilters}
                        className="ml-auto shrink-0"
                        aria-label="Reset all filters"
                    >
                        <RotateCcw className="mr-1.5 h-4 w-4 shrink-0" aria-hidden />
                        Reset
                    </Button>
                )}
            </div>

            {isLoading ? (
                <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 text-muted-foreground py-12">
                    <div
                        className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"
                        aria-hidden
                    />
                    <p className="text-sm">Loading students…</p>
                </div>
            ) : error ? (
                <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 text-destructive py-12">
                    <AlertCircle className="h-8 w-8" aria-hidden />
                    <p className="text-sm">Failed to load students. Please try again.</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Retry
                    </Button>
                </div>
            ) : students.length === 0 ? (
                <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-2 text-muted-foreground py-12 max-w-sm text-center">
                    <Users className="h-10 w-10 opacity-20" aria-hidden />
                    <p className="text-sm font-medium">No students found</p>
                    <p className="text-sm">Try adjusting your filters.</p>
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
