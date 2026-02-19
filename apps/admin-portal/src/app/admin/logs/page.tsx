'use client';

import React, { useState, useMemo } from "react";
import { useAuditLogs, AuditLogFilters } from "@/lib/hooks/useAuditLogs";
import {
    Button,
    cn,
    DataTablePagination,
    Input,
    Popover,
    PopoverContent,
    PopoverTrigger,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    useIsMobile,
    useToast,
} from "@narada/ui";
import { Filter, AlertCircle, ChevronDown, RotateCcw, ArrowUpDown, FileSearch } from "lucide-react";
import { format } from "date-fns";
import {
    ColumnDef,
    Column,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    SortingState,
} from "@tanstack/react-table";

function TimestampCell({ timestamp }: { timestamp: string }) {
    const date = new Date(timestamp);
    const formatted = format(date, "MMM dd, yyyy hh:mm:ss a");
    return (
        <span className="whitespace-nowrap tabular-nums text-foreground" title={formatted}>
            {formatted}
        </span>
    );
}

function UserCell({ firstName, lastName, email }: { firstName?: string; lastName?: string; email?: string }) {
    if (!firstName && !lastName && !email) {
        return <span className="text-muted-foreground">—</span>;
    }
    const displayName = firstName && lastName ? `${firstName} ${lastName}`.trim() : email || '—';
    return (
        <span className="min-w-0 truncate block font-medium text-foreground" title={displayName}>
            {displayName}
        </span>
    );
}

function ChangesCell({ changes }: { changes: any }) {
    if (!changes || Object.keys(changes).length === 0) {
        return <span className="text-muted-foreground">—</span>;
    }

    const filteredEntries = Object.entries(changes).filter(
        ([key]) => !['timestamp', 'approvedAt', 'createdAt', 'updatedAt'].includes(key)
    );

    if (filteredEntries.length === 0) {
        return <span className="text-muted-foreground">—</span>;
    }

    const fieldCount = filteredEntries.length;

    if (fieldCount <= 2) {
        const isSimple = filteredEntries.every(([_, value]) =>
            typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        );

        if (isSimple) {
            const line = filteredEntries.map(([key, value]) => `${key}: ${String(value)}`).join(', ');
            return <span className="min-w-0 truncate block" title={line}>{line}</span>;
        }
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button className="font-medium text-primary hover:underline text-left">
                    {fieldCount} field{fieldCount > 1 ? 's' : ''} changed
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
                <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">Changes</p>
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                        {filteredEntries.map(([key, value]) => (
                            <div key={key} className="text-sm">
                                <span className="font-medium text-muted-foreground">{key}:</span>
                                <pre className="mt-0.5 rounded bg-muted p-1.5 overflow-auto max-h-32 text-xs">
                                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                </pre>
                            </div>
                        ))}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

function SortableHeader({ column, label }: { column: Column<any>; label: string }) {
    return (
        <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 hover:text-foreground transition-colors -ml-1 px-1"
        >
            {label}
            <ArrowUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
    );
}

const columns: ColumnDef<any>[] = [
    {
        accessorKey: "timestamp",
        header: ({ column }) => <SortableHeader column={column} label="Time" />,
        cell: ({ row }) => <TimestampCell timestamp={row.original.timestamp} />,
    },
    {
        accessorKey: "action",
        header: ({ column }) => <SortableHeader column={column} label="Action" />,
        cell: ({ row }) => (
            <span className="min-w-0 truncate block" title={row.original.action}>
                {row.original.action.replace(/_/g, " ")}
            </span>
        ),
    },
    {
        accessorKey: "userId",
        header: ({ column }) => <SortableHeader column={column} label="User" />,
        cell: ({ row }) => (
            <UserCell
                firstName={row.original.userFirstName}
                lastName={row.original.userLastName}
                email={row.original.userEmail}
            />
        ),
    },
    {
        accessorKey: "resourceType",
        header: ({ column }) => <SortableHeader column={column} label="Resource" />,
        cell: ({ row }) => (
            <span className="min-w-0 truncate block font-mono text-muted-foreground" title={row.original.resourceType}>
                {row.original.resourceType}
            </span>
        ),
    },
    {
        accessorKey: "resourceId",
        header: ({ column }) => (
            <div className="flex justify-end">
                <SortableHeader column={column} label="ID" />
            </div>
        ),
        cell: ({ row }) => (
            <span className="font-mono text-muted-foreground inline-block text-right w-full" title={row.original.resourceId}>
                {row.original.resourceId?.substring(0, 8)}…
            </span>
        ),
    },
    {
        accessorKey: "changes",
        header: ({ column }) => <SortableHeader column={column} label="Changes" />,
        cell: ({ row }) => <ChangesCell changes={row.original.changes} />,
    },
];

export default function AuditLogsPage() {
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const [filters, setFilters] = useState<AuditLogFilters>({ limit: 25, offset: 0 });
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [actionFilter, setActionFilter] = useState<string>("all");
    const [resourceTypeFilter, setResourceTypeFilter] = useState<string>("all");
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [userSearchInput, setUserSearchInput] = useState<string>("");
    const [userDropdownOpen, setUserDropdownOpen] = useState<boolean>(false);
    const [sorting, setSorting] = useState<SortingState>([]);

    const { data, isLoading, error, refetch } = useAuditLogs(filters);

    const logs = data?.data ?? [];
    const pagination = data?.pagination;
    const limit = filters.limit || 25;
    const offset = filters.offset ?? 0;
    const total = Number((pagination as { total?: number } | undefined)?.total ?? logs.length);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(Math.floor(offset / limit) + 1, totalPages);


    const allUsers = useMemo(() =>
        Array.from(
            new Map(
                logs
                    .filter(log => log.userFirstName || log.userLastName || log.userEmail)
                    .map(log => [
                        log.userId,
                        {
                            id: log.userId,
                            name: `${log.userFirstName || ''} ${log.userLastName || ''}`.trim(),
                            email: log.userEmail || '',
                            firstName: log.userFirstName || '',
                            lastName: log.userLastName || '',
                        }
                    ])
            ).values()
        ),
        [logs]
    );

    const matchingUsers = useMemo(() => {
        if (!userSearchInput.trim()) return allUsers;
        const searchLower = userSearchInput.toLowerCase();
        return allUsers.filter(user =>
            user.name.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower)
        );
    }, [userSearchInput, allUsers]);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            if (selectedUserId && log.userId !== selectedUserId) return false;
            return true;
        });
    }, [logs, selectedUserId]);

    const uniqueActions = useMemo(() =>
        Array.from(new Set(logs.map(log => log.action))).sort(),
        [logs]
    );

    const uniqueResourceTypes = useMemo(() =>
        Array.from(new Set(logs.map(log => log.resourceType))).sort(),
        [logs]
    );

    const table = useReactTable({
        data: filteredLogs,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    const resetFilters = () => {
        setFilters({ limit: 25, offset: 0 });
        setStartDate("");
        setEndDate("");
        setActionFilter("all");
        setResourceTypeFilter("all");
        setSelectedUserId("");
        setUserSearchInput("");
        setUserDropdownOpen(false);
        toast({ title: "Filters reset" });
    };

    const hasData = !isLoading && !error && filteredLogs.length > 0;

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {/* Toolbar */}
            <div
                className="flex flex-shrink-0 flex-wrap items-center gap-3 py-3"
                role="group"
                aria-label="Audit log filters"
            >
                <div className="flex items-center gap-2 shrink-0 border-r border-border pr-3">
                    <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                </div>

                <Select
                    value={actionFilter}
                    onValueChange={(value) => {
                        setActionFilter(value);
                        setFilters({ ...filters, action: value === "all" ? undefined : value, offset: 0 });
                    }}
                >
                    <SelectTrigger className="h-9 w-[140px] shrink-0 bg-card" aria-label="Filter by action">
                        <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        {uniqueActions.map((action) => (
                            <SelectItem key={action} value={action}>{action.replace(/_/g, " ")}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={resourceTypeFilter}
                    onValueChange={(value) => {
                        setResourceTypeFilter(value);
                        setFilters({ ...filters, resourceType: value === "all" ? undefined : value, offset: 0 });
                    }}
                >
                    <SelectTrigger className="h-9 w-[140px] shrink-0 bg-card" aria-label="Filter by resource type">
                        <SelectValue placeholder="Resource type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Resources</SelectItem>
                        {uniqueResourceTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Popover open={userDropdownOpen} onOpenChange={setUserDropdownOpen}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            className={cn(
                                "flex h-9 min-w-[140px] shrink-0 items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                                selectedUserId ? "text-foreground" : "text-muted-foreground"
                            )}
                            aria-label={selectedUserId ? `Filter by user: ${allUsers.find(u => u.id === selectedUserId)?.name}` : "Filter by user"}
                            aria-expanded={userDropdownOpen}
                            aria-haspopup="dialog"
                        >
                            <span className="truncate">
                                {selectedUserId ? allUsers.find(u => u.id === selectedUserId)?.name : "Filter by user"}
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[220px] p-2" align="start" aria-label="Choose user">
                        <Input
                            type="search"
                            autoComplete="off"
                            spellCheck={false}
                            className="mb-2 h-8 w-full text-sm"
                            placeholder="Search user…"
                            value={userSearchInput}
                            onChange={(e) => setUserSearchInput(e.target.value)}
                            aria-label="Search users"
                            autoFocus={!isMobile}
                        />
                        <div className="max-h-[200px] overflow-y-auto overscroll-behavior-contain space-y-0.5">
                            <button
                                type="button"
                                className={cn(
                                    "w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                                    !selectedUserId && "bg-accent/50 font-medium"
                                )}
                                onClick={() => {
                                    setSelectedUserId("");
                                    setUserDropdownOpen(false);
                                }}
                            >
                                All users
                            </button>
                            {matchingUsers.length === 0 && userSearchInput.trim() ? (
                                <p className="px-2 py-1.5 text-sm text-muted-foreground" role="status">
                                    No users found
                                </p>
                            ) : (
                                matchingUsers.map((user) => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        className={cn(
                                            "w-full rounded-sm px-2 py-1.5 text-left text-sm truncate hover:bg-accent focus:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                                            selectedUserId === user.id && "bg-accent/50 font-medium"
                                        )}
                                        onClick={() => {
                                            setSelectedUserId(user.id);
                                            setUserDropdownOpen(false);
                                        }}
                                    >
                                        {user.name}
                                    </button>
                                ))
                            )}
                        </div>
                    </PopoverContent>
                </Popover>

                <div
                    className="flex h-9 shrink-0 items-center gap-2 border-l border-border pl-3"
                    role="group"
                    aria-label="Date range"
                >
                    <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                            setStartDate(e.target.value);
                            setFilters({ ...filters, startDate: e.target.value, offset: 0 });
                        }}
                        className="block h-9 w-[130px] shrink-0 text-sm bg-card"
                        placeholder="From"
                        aria-label="From date"
                    />
                    <span className="text-muted-foreground shrink-0 text-sm" aria-hidden>–</span>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                            setEndDate(e.target.value);
                            setFilters({ ...filters, endDate: e.target.value, offset: 0 });
                        }}
                        className="block h-9 w-[130px] shrink-0 text-sm bg-card"
                        placeholder="To"
                        aria-label="To date"
                    />
                </div>

                {(actionFilter !== "all" || selectedUserId || resourceTypeFilter !== "all" || startDate || endDate) && (
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

            {/* Content: loading / error / empty (centered) or table + pagination */}
            {isLoading ? (
                <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 text-muted-foreground py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" aria-hidden />
                    <p className="text-sm">Loading audit logs…</p>
                </div>
            ) : error ? (
                <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 text-destructive py-12">
                    <AlertCircle className="h-8 w-8" aria-hidden />
                    <p className="text-sm">Failed to load audit logs. Please try again.</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Retry
                    </Button>
                </div>
            ) : filteredLogs.length === 0 ? (
                <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-2 text-muted-foreground py-12 max-w-sm text-center">
                    <FileSearch className="h-10 w-10 opacity-20" aria-hidden />
                    <p className="text-sm font-medium">No audit logs found</p>
                    <p className="text-sm">Try adjusting your filters.</p>
                </div>
            ) : (
                <>
                    <div className="flex min-h-0 flex-1 flex-col rounded-md border overflow-hidden">
                        <Table className="w-full table-fixed [&_th]:h-9 [&_th]:py-1.5 [&_th]:px-3 [&_td]:py-1.5 [&_td]:px-3 [&_td]:overflow-hidden [&_tr]:h-[52px]" scrollContainerStyle={{ height: "100%" }}>
                            <TableHeader className="sticky top-0 z-10 bg-muted [&_tr]:border-b">
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
                            <TableBody className="[&_tr]:bg-card">
                                {table.getRowModel().rows.map(row => (
                                    <TableRow key={row.id} className="border-l-2 border-l-transparent hover:border-l-primary/50 transition-colors">
                                        {row.getVisibleCells().map(cell => (
                                            <TableCell
                                                key={cell.id}
                                                className={cell.column.id === "resourceId" ? "text-right" : undefined}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <DataTablePagination
                            className="shrink-0 py-3 [&_button]:bg-card"
                            currentPage={currentPage}
                            totalPages={totalPages}
                            pageSize={limit}
                            totalRowCount={total}
                            onPageChange={(page) => setFilters((prev) => ({ ...prev, offset: (page - 1) * (prev.limit ?? 25) }))}
                            onPageSizeChange={(size) => setFilters((prev) => ({ ...prev, limit: size, offset: 0 }))}
                        />
                </>
            )}
        </div>
    );
}
