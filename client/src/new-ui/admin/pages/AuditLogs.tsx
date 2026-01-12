import React, { useState, useMemo } from "react";
import { useAuditLogs, AuditLogFilters } from "../hooks/useAuditLogs";
import { useToast } from "@/features/shared-features/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarIcon, Filter, AlertCircle, ChevronDown, RotateCcw, Copy, ChevronUp, ArrowUpDown, FileSearch } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import { Badge } from "@/components/design-system/Badge";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useRoleGuard } from '@/features/shared-features/hooks/useRoleGuard';

const ITEMS_PER_PAGE = 25;

function TimestampCell({ timestamp }: { timestamp: string }) {
  const date = new Date(timestamp);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-medium text-foreground">
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
      <span className="text-sm font-medium text-foreground">
        {displayName}
      </span>
      {email && (
        <span className="text-xs text-muted-foreground">
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

  // Filter out redundant timestamp fields (we already have a Time column)
  const filteredEntries = Object.entries(changes).filter(
    ([key]) => !['timestamp', 'approvedAt', 'createdAt', 'updatedAt'].includes(key)
  );

  if (filteredEntries.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const fieldCount = filteredEntries.length;

  // For simple changes (1-2 fields with primitive values), show inline
  if (fieldCount <= 2) {
    const isSimple = filteredEntries.every(([_, value]) =>
      typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    );

    if (isSimple) {
      return (
        <div className="flex flex-col gap-1">
          {filteredEntries.map(([key, value]) => (
            <div key={key} className="text-xs">
              <span className="font-medium text-foreground/70">{key}:</span>{' '}
              <span className="text-foreground">{String(value)}</span>
            </div>
          ))}
        </div>
      );
    }
  }

  // For complex changes, use popover
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">
          {fieldCount} field{fieldCount > 1 ? 's' : ''}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Changes</p>
          <div className="space-y-1.5">
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

export default function AuditLogs() {
  useRoleGuard(['admin']);
  const { toast } = useToast();
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
  const total = (pagination as any)?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  // Get unique users from all logs (not filtered)
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

  // Filter users based on search input
  const matchingUsers = useMemo(() => {
    if (!userSearchInput.trim()) return allUsers;
    const searchLower = userSearchInput.toLowerCase();
    return allUsers.filter(user =>
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.firstName.toLowerCase().includes(searchLower) ||
      user.lastName.toLowerCase().includes(searchLower)
    );
  }, [userSearchInput, allUsers]);

  // Apply filters to logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (selectedUserId && log.userId !== selectedUserId) return false;
      return true;
    });
  }, [logs, selectedUserId]);

  // Get unique actions and resource types from all logs
  const uniqueActions = useMemo(() =>
    Array.from(new Set(logs.map(log => log.action))).sort(),
    [logs]
  );

  const uniqueResourceTypes = useMemo(() =>
    Array.from(new Set(logs.map(log => log.resourceType))).sort(),
    [logs]
  );

  // Define columns using TanStack React Table
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "timestamp",
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-2 hover:bg-muted/50 px-2 py-1 rounded transition-colors"
        >
          TIME
          {column.getIsSorted() ? (
            column.getIsSorted() === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )
          ) : (
            <ArrowUpDown className="h-4 w-4 opacity-50" />
          )}
        </button>
      ),
      cell: ({ row }) => <TimestampCell timestamp={row.original.timestamp} />,
      size: 120,
    },
    {
      accessorKey: "action",
      header: "ACTION",
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {row.original.action.replace(/_/g, " ")}
        </span>
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
      size: 170,
    },
    {
      accessorKey: "resourceType",
      header: "RESOURCE",
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.resourceType}</span>,
      size: 100,
    },
    {
      accessorKey: "resourceId",
      header: "RESOURCE ID",
      cell: ({ row }) => (
        <span className="text-sm font-mono text-muted-foreground">
          {row.original.resourceId}
        </span>
      ),
      size: 180,
    },
    {
      accessorKey: "changes",
      header: "CHANGES",
      cell: ({ row }) => <ChangesCell changes={row.original.changes} />,
      size: 280,
    },
  ];

  // Initialize table
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
    toast({
      title: "Filters reset",
      description: "All filters have been cleared."
    });
  };

  const handleRetry = () => {
    refetch();
    toast({
      title: "Retrying...",
      description: "Attempting to reload audit logs."
    });
  };

  const goToPage = (page: number) => {
    setFilters({ ...filters, offset: (page - 1) * limit });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Fixed Header / Inline Filters */}
      <div className="flex-shrink-0 px-4 py-4 bg-background z-10">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="h-4 w-4" />
              <span>Filters:</span>
            </div>

            {/* Action Dropdown */}
            <Select
              value={actionFilter}
              onValueChange={(value) => {
                setActionFilter(value);
                setFilters({
                  ...filters,
                  action: value === "all" ? undefined : value,
                  offset: 0
                });
              }}
            >
              <SelectTrigger className="w-fit min-w-32 h-8">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Resource Type Dropdown */}
            <Select
              value={resourceTypeFilter}
              onValueChange={(value) => {
                setResourceTypeFilter(value);
                setFilters({
                  ...filters,
                  resourceType: value === "all" ? undefined : value,
                  offset: 0
                });
              }}
            >
              <SelectTrigger className="w-fit min-w-32 h-8">
                <SelectValue placeholder="Resource Type" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="all">All Resources</SelectItem>
                {uniqueResourceTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* User Search Dropdown */}
            <Popover open={userDropdownOpen} onOpenChange={setUserDropdownOpen}>
              <PopoverTrigger asChild>
                <button
                  className="h-8 w-fit min-w-40 rounded-md border border-input bg-background px-3 py-1 text-sm text-left flex items-center justify-between hover:bg-muted/50"
                  aria-label="Search user by name or email"
                >
                  <span className={selectedUserId ? "text-foreground" : "text-muted-foreground"}>
                    {selectedUserId ? allUsers.find(u => u.id === selectedUserId)?.name : "Search user..."}
                  </span>
                  <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2 z-50" align="start">
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={userSearchInput}
                  onChange={(e) => setUserSearchInput(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
                <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
                  <button
                    onClick={() => {
                      setSelectedUserId("");
                      setUserSearchInput("");
                      setUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    All Users
                  </button>
                  {matchingUsers.length > 0 ? (
                    matchingUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setUserSearchInput("");
                          setUserDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-2 py-1.5 text-sm rounded transition-colors",
                          selectedUserId === user.id
                            ? "bg-primary/10 border border-primary/30 text-primary"
                            : "hover:bg-muted"
                        )}
                      >
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </button>
                    ))
                  ) : (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No users found
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Start Date */}
            <div className="flex items-center gap-2">
              <Label htmlFor="start-date" className="text-muted-foreground text-sm whitespace-nowrap">
                From:
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setFilters({
                    ...filters,
                    startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                    offset: 0
                  });
                }}
                className="h-8 w-fit"
              />
            </div>

            {/* End Date */}
            <div className="flex items-center gap-2">
              <Label htmlFor="end-date" className="text-muted-foreground text-sm whitespace-nowrap">
                To:
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setFilters({
                    ...filters,
                    endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                    offset: 0
                  });
                }}
                className="h-8 w-fit"
              />
            </div>

            {/* Clear Filters Button */}
            {(actionFilter !== "all" || selectedUserId || resourceTypeFilter !== "all" || startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8 px-2 text-sm"
                aria-label="Clear all filters"
              >
                Clear filters
              </Button>
            )}
          </div>

          {/* Showing X of Y items */}
          {(actionFilter !== "all" || selectedUserId || resourceTypeFilter !== "all" || startDate || endDate) && (
            <div className="text-muted-foreground text-sm">
              Showing {filteredLogs.length} of {total} items
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 px-4">
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3 p-4" role="status" aria-label="Loading audit logs">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-28" />
                  <Skeleton className="h-10 w-20" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div
            className="rounded-2xl border border-destructive/50 bg-destructive/10 p-6 m-4"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-destructive/20 p-3">
                <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-destructive mb-1">Failed to Load Audit Logs</h3>
                <p className="text-sm text-destructive/80">
                  Unable to fetch audit logs. Please ensure you have admin access and try again.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleRetry}
                className="border-destructive/50 hover:bg-destructive/10"
                aria-label="Retry loading audit logs"
              >
                <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Table Section */}
        {!isLoading && !error && (
          <div className="h-full rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="border-b border-border/60 hover:bg-transparent">
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className="text-xs font-bold text-foreground/70 uppercase tracking-widest bg-muted/40"
                          style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody className="[&_tr:last-child]:border-b">
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className="py-2"
                            style={{ width: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined }}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="rounded-full bg-muted/50 p-6">
                            <FileSearch className="h-9 w-9 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold">No Audit Logs</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              No logs match your filters. Try adjusting your search.
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={resetFilters}
                            className="text-xs mt-2"
                          >
                            <RotateCcw className="mr-1.5 h-3 w-3" />
                            Reset Filters
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {!isLoading && !error && (
        <div className="flex-shrink-0">
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={limit}
            onPageChange={goToPage}
            onPageSizeChange={(newSize) => setFilters({ ...filters, limit: newSize, offset: 0 })}
          />
        </div>
      )}
    </div>
  );
}
