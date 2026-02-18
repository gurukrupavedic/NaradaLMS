'use client';

import React, { useState, useMemo } from "react";
import { useAuditLogs, AuditLogFilters } from "@/lib/hooks/useAuditLogs";
import { useToast } from "@narada/ui";
import { Button } from "@narada/ui";
import { Input } from "@narada/ui";
import { Label } from "@narada/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@narada/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@narada/ui";
import { Skeleton } from "@narada/ui";
import { Badge } from "@narada/ui";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@narada/ui";
import { Filter, AlertCircle, ChevronDown, RotateCcw, ChevronUp, ArrowUpDown, FileSearch } from "lucide-react";
import { format } from "date-fns";
import { cn, useIsMobile } from "@narada/ui";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    SortingState,
} from "@tanstack/react-table";
import { DataTablePagination } from "@narada/ui";

// Helper components for cells
function TimestampCell({ timestamp }: { timestamp: string }) {
    const date = new Date(timestamp);
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium tabular-nums text-foreground">
                {format(date, "MMM dd, yyyy hh:mm:ss a")}
            </span>
        </div>
    );
}

function UserCell({ firstName, lastName, email }: { firstName?: string; lastName?: string; email?: string }) {
    if (!firstName && !lastName && !email) {
        return <span className="text-xs text-muted-foreground">—</span>;
    }

    const displayName = firstName && lastName ? `${firstName} ${lastName}` : '—';
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-foreground max-w-[150px] truncate" title={displayName}>
                {displayName}
            </span>
            {email && (
                <span className="text-xs text-muted-foreground max-w-[150px] truncate" title={email}>
                    {email}
                </span>
            )}
        </div>
    );
}

function ChangesCell({ changes }: { changes: any }) {
    if (!changes || Object.keys(changes).length === 0) {
        return <span className="text-xs text-muted-foreground">—</span>;
    }

    // Filter out redundant timestamp fields
    const filteredEntries = Object.entries(changes).filter(
        ([key]) => !['timestamp', 'approvedAt', 'createdAt', 'updatedAt'].includes(key)
    );

    if (filteredEntries.length === 0) {
        return <span className="text-xs text-muted-foreground">—</span>;
    }

    const fieldCount = filteredEntries.length;

    // Simple changes shown inline
    if (fieldCount <= 2) {
        const isSimple = filteredEntries.every(([_, value]) =>
            typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        );

        if (isSimple) {
            return (
                <div className="flex flex-col gap-1 max-w-[300px]">
                    {filteredEntries.map(([key, value]) => (
                        <div key={key} className="text-xs truncate">
                            <span className="font-medium text-foreground/70">{key}:</span>{' '}
                            <span className="text-foreground">{String(value)}</span>
                        </div>
                    ))}
                </div>
            );
        }
    }

    // Complex changes use popover
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">
                    {fieldCount} field{fieldCount > 1 ? 's' : ''} changed
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
                <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">Changes</p>
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                        {filteredEntries.map(([key, value]) => (
                            <div key={key} className="text-xs">
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
    const offset = filters.offset || 0;
    const total = (pagination as any)?.total || logs.length; // Fallback to length if total missing
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    // Extract unique users for filter dropdown
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

    // Client-side filtering for user (since API might not support it fully yet)
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

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "timestamp",
            header: ({ column }) => (
                <button
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="flex items-center gap-1.5 text-xs hover:bg-muted/50 px-2 py-0.5 rounded transition-colors"
                >
                    TIME
                    {column.getIsSorted() ? (
                        column.getIsSorted() === "asc" ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />
                    ) : (
                        <ArrowUpDown className="h-2.5 w-2.5 opacity-50" />
                    )}
                </button>
            ),
            cell: ({ row }) => <TimestampCell timestamp={row.original.timestamp} />,
            size: 160,
        },
        {
            accessorKey: "action",
            header: "ACTION",
            cell: ({ row }) => (
                <Badge variant="outline" className="font-normal text-xs">
                    {row.original.action.replace(/_/g, " ")}
                </Badge>
            ),
            size: 140,
        },
        {
            accessorKey: "userId",
            header: "USER",
            cell: ({ row }) => (
                <UserCell
                    firstName={row.original.userFirstName}
                    lastName={row.original.userLastName}
                    email={row.original.userEmail}
                />
            ),
            size: 180,
        },
        {
            accessorKey: "resourceType",
            header: "RESOURCE",
            cell: ({ row }) => <span className="text-xs font-medium">{row.original.resourceType}</span>,
            size: 120,
        },
        {
            accessorKey: "resourceId",
            header: "ID",
            cell: ({ row }) => (
                    <span className="text-xs font-mono text-muted-foreground" title={row.original.resourceId}>
                    {row.original.resourceId?.substring(0, 8)}…
                </span>
            ),
            size: 100,
        },
        {
            accessorKey: "changes",
            header: "CHANGES",
            cell: ({ row }) => <ChangesCell changes={row.original.changes} />,
            size: 300,
        },
    ];

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

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-background">
            {/* Inline Filters Bar */}
            <div
                className="flex flex-shrink-0 flex-wrap items-center gap-2 bg-card/50 p-2.5"
                role="group"
                aria-label="Audit log filters"
            >
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground shrink-0">
                    <Filter className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>Filters</span>
                </div>

                <Select
                    value={actionFilter}
                    onValueChange={(value) => {
                        setActionFilter(value);
                        setFilters({ ...filters, action: value === "all" ? undefined : value, offset: 0 });
                    }}
                >
                    <SelectTrigger className="h-8 w-[132px] shrink-0 rounded border-border px-2.5 py-1.5 text-xs" aria-label="Filter by action">
                        <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent className="p-0.5">
                        <SelectItem value="all" className="py-1 pl-6 pr-2 text-xs">All Actions</SelectItem>
                        {uniqueActions.map((action) => (
                            <SelectItem key={action} value={action} className="py-1 pl-6 pr-2 text-xs">{action.replace(/_/g, " ")}</SelectItem>
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
                    <SelectTrigger className="h-8 w-[132px] shrink-0 rounded border-border px-2.5 py-1.5 text-xs" aria-label="Filter by resource type">
                        <SelectValue placeholder="Resource type" />
                    </SelectTrigger>
                    <SelectContent className="p-0.5">
                        <SelectItem value="all" className="py-1 pl-6 pr-2 text-xs">All Resources</SelectItem>
                        {uniqueResourceTypes.map((type) => (
                            <SelectItem key={type} value={type} className="py-1 pl-6 pr-2 text-xs">{type}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Popover open={userDropdownOpen} onOpenChange={setUserDropdownOpen}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            className={cn(
                                "flex h-8 min-w-[132px] shrink-0 items-center justify-between rounded border border-input bg-background px-2.5 py-1.5 text-xs ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                                selectedUserId ? "text-foreground" : "text-muted-foreground"
                            )}
                            aria-label={selectedUserId ? `Filter by user: ${allUsers.find(u => u.id === selectedUserId)?.name}` : "Filter by user"}
                            aria-expanded={userDropdownOpen}
                            aria-haspopup="dialog"
                        >
                            <span className="truncate">
                                {selectedUserId ? allUsers.find(u => u.id === selectedUserId)?.name : "Filter by user"}
                            </span>
                            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-1.5" align="start" aria-label="Choose user">
                        <Input
                            type="search"
                            autoComplete="off"
                            spellCheck={false}
                            className="mb-1.5 block h-7 w-full text-xs"
                            placeholder="Search user…"
                            value={userSearchInput}
                            onChange={(e) => setUserSearchInput(e.target.value)}
                            aria-label="Search users"
                            autoFocus={!isMobile}
                        />
                        <div className="max-h-[180px] overflow-y-auto overscroll-behavior-contain space-y-0.5">
                            <button
                                type="button"
                                className={cn(
                                    "w-full rounded-sm px-2 py-1 text-left text-xs hover:bg-accent focus:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
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
                                <p className="px-2 py-1.5 text-xs text-muted-foreground" role="status">
                                    No users found
                                </p>
                            ) : (
                                matchingUsers.map((user) => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        className={cn(
                                            "w-full rounded-sm px-2 py-1 text-left text-xs truncate hover:bg-accent focus:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
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
                    className="flex h-8 shrink-0 items-center gap-1.5 border-l border-border pl-2"
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
                        className="block h-8 w-[112px] shrink-0 px-2 py-1.5 text-xs"
                        placeholder="From"
                        aria-label="From date"
                    />
                    <span className="text-muted-foreground shrink-0 text-xs" aria-hidden>–</span>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                            setEndDate(e.target.value);
                            setFilters({ ...filters, endDate: e.target.value, offset: 0 });
                        }}
                        className="block h-8 w-[112px] shrink-0 px-2 py-1.5 text-xs"
                        placeholder="To"
                        aria-label="To date"
                    />
                </div>

                {(actionFilter !== "all" || selectedUserId || resourceTypeFilter !== "all" || startDate || endDate) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetFilters}
                        className="ml-auto h-8 shrink-0 px-2 text-xs"
                        aria-label="Reset all filters"
                    >
                        <RotateCcw className="mr-1.5 h-3 w-3 shrink-0" aria-hidden />
                        Reset
                    </Button>
                )}
            </div>

            {/* Table Area — min-h-0 so flex constrains height and table scrolls instead of page */}
            <div className="flex min-h-0 flex-1 flex-col rounded-md border bg-card p-4 overflow-hidden items-center justify-center">
                {isLoading ? (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" aria-hidden />
                        <p className="text-sm">Loading audit logs…</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center gap-3 text-destructive">
                        <AlertCircle className="h-8 w-8" aria-hidden />
                        <p className="text-sm">Failed to load audit logs. Please try again.</p>
                        <Button variant="outline" size="sm" onClick={() => refetch()}>
                            Retry
                        </Button>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileSearch className="h-10 w-10 opacity-20" aria-hidden />
                        <p className="text-sm font-medium">No audit logs found</p>
                        <p className="text-sm">Try adjusting your filters.</p>
                    </div>
                ) : (
                    <div className="min-h-0 w-full flex-1 flex flex-col">
                        <Table className="text-xs [&_tr]:border-border/50" scrollContainerStyle={{ height: "100%" }}>
                            <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))] [&_tr]:border-b-0">
                                {table.getHeaderGroups().map(headerGroup => (
                                    <TableRow key={headerGroup.id} className="border-b border-border bg-card">
                                        {headerGroup.headers.map(header => (
                                            <TableHead key={header.id} style={{ width: header.getSize() }} className="h-8 px-2.5 text-xs font-medium text-muted-foreground bg-card">
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows.map(row => (
                                    <TableRow key={row.id} className="hover:bg-muted/50">
                                        {row.getVisibleCells().map(cell => (
                                            <TableCell key={cell.id} className="py-2 px-2.5 text-xs">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Pagination Footer */}
            {!isLoading && !error && filteredLogs.length > 0 && (
                <div className="bg-card/50 p-2.5">
                    <DataTablePagination
                        variant="compact"
                        currentPage={currentPage}
                        totalPages={totalPages}
                        pageSize={limit}
                        onPageChange={(page) => setFilters({ ...filters, offset: (page - 1) * limit })}
                        onPageSizeChange={(size) => setFilters({ ...filters, limit: size, offset: 0 })}
                    />
                </div>
            )}
        </div>
    );
}
