import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X, Filter, AlertCircle, RefreshCw, MoreVertical, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MyStudent } from '@shared/types';
import { useMyStudents } from '../hooks/useMyStudents';
import { useInstructorBatches } from '../hooks/useInstructorBatches';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTablePagination } from '@/components/ui/data-table-pagination';

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function MyStudentsPage() {
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Filter state
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<number | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'dropped' | 'completed' | undefined>('active');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedBatchId, selectedStatus]);

  const offset = (page - 1) * limit;
  const { data, isLoading, isError, error, refetch } = useMyStudents({
    limit,
    offset,
    search: searchQuery || undefined,
    batchId: selectedBatchId,
    status: selectedStatus,
  });

  // Fetch instructor batches for filter dropdown
  const { data: batches, isLoading: batchesLoading } = useInstructorBatches();

  // Count active filters (excluding default 'active' status)
  const activeFilterCount = [
    searchQuery ? 1 : 0,
    selectedBatchId ? 1 : 0,
    selectedStatus && selectedStatus !== 'active' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Clear all filters
  const clearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setSelectedBatchId(undefined);
    setSelectedStatus('active');
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.pagination.total / limit) : 0;

  // Define columns
  const columns = useMemo<ColumnDef<MyStudent>[]>(
    () => [
      {
        accessorKey: 'rollNumber',
        header: 'ROLL#',
        cell: ({ row }) => (
          <button
            onClick={() => navigate(`/app/instructor/students/${row.original.id}`)}
            className="text-blue-600 hover:underline font-medium"
          >
            {row.getValue('rollNumber')}
          </button>
        ),
        size: 100,
      },
      {
        accessorKey: 'name',
        header: 'NAME',
        cell: ({ row }) => (
          <button
            onClick={() => navigate(`/app/instructor/students/${row.original.id}`)}
            className="text-blue-600 hover:underline"
          >
            {row.getValue('name')}
          </button>
        ),
        size: 200,
      },
      {
        accessorKey: 'email',
        header: 'CONTACT',
        cell: ({ row }) => row.getValue('email'),
        size: 200,
      },
      {
        accessorKey: 'timezone',
        header: 'TIMEZONE',
        cell: ({ row }) => row.getValue('timezone'),
        size: 150,
      },
      {
        accessorKey: 'type',
        header: 'TYPE',
        cell: ({ row }) => row.getValue('type'),
        size: 120,
      },
      {
        id: 'batch',
        header: 'BATCH',
        cell: ({ row }) => (
          <div className="text-sm">
            <div className="font-medium">{row.original.batchCode}</div>
            <div className="text-muted-foreground">{row.original.batchName}</div>
          </div>
        ),
        size: 250,
      },
      {
        id: 'actions',
        header: 'ACTIONS',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white dark:bg-black border border-border shadow-lg min-w-[180px]">
              {/* Actions to be implemented in Phase D/E */}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        size: 60,
      },
    ],
    [navigate]
  );

  // Create table instance
  const table = useReactTable({
    data: data?.items || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const isLoadingState = isLoading;

  // Loading state - skeleton loader
  if (isLoadingState) {
    return (
      <div className="space-y-6 px-4 pt-4">
        <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
          <TableSkeleton rows={5} cols={7} />
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-6 px-4 pt-4">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Failed to load students.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data?.items || data.items.length === 0) {
    return (
      <div className="space-y-6 px-4 pt-4">
        {/* Filters Section */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="h-4 w-4" />
              <span>Filters:</span>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-8 pl-9 pr-9"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Batch Filter */}
            <Select
              value={selectedBatchId ? String(selectedBatchId) : 'all'}
              onValueChange={(value) => setSelectedBatchId(value === 'all' ? undefined : parseInt(value))}
            >
              <SelectTrigger className="h-8 w-fit min-w-40">
                <SelectValue placeholder="All Batches" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="all">All Batches</SelectItem>
                {batchesLoading ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : (
                  batches?.map((batch) => (
                    <SelectItem key={batch.id} value={String(batch.id)}>
                      {batch.batchCode} - {batch.batchName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={selectedStatus || 'all'}
              onValueChange={(value) => setSelectedStatus(value === 'all' ? undefined : value as 'active' | 'dropped' | 'completed')}
            >
              <SelectTrigger className="h-8 w-fit min-w-32">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="dropped">Dropped</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
              className="h-8 w-8"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            {/* Clear Filters + Active Count */}
            {activeFilterCount > 0 && (
              <>
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 h-8">
                  <X className="h-4 w-4" />
                  Clear
                </Button>
                <Badge variant="secondary" className="text-xs">
                  {activeFilterCount} active
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Table with Empty State */}
        <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40 sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b border-border/60 hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{
                        width: header.getSize() !== 150 ? header.getSize() : undefined,
                      }}
                      className="text-xs font-bold text-foreground/70 uppercase tracking-widest"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={columns.length} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="rounded-full bg-muted/50 p-6">
                      <Users className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">
                        {activeFilterCount > 0 ? 'No students match your filters' : 'No students yet'}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activeFilterCount > 0
                          ? 'Try adjusting your search or filter criteria'
                          : "You don't have any students in your batches yet"}
                      </p>
                    </div>
                    {activeFilterCount > 0 && (
                      <Button variant="outline" size="sm" onClick={clearFilters}>
                        <X className="mr-1.5 h-3 w-3" />
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <DataTablePagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setLimit(newSize);
            setPage(1);
          }}
          pageSizeOptions={ROWS_PER_PAGE_OPTIONS}
        />
      </div>
    );
  }

  // Success state - render table
  return (
    <div className="space-y-6 px-4 pt-4">
      {/* Inline Filters - AuditLogs Pattern */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4" />
            <span>Filters:</span>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-8 pl-9 pr-9"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Batch Filter */}
          <Select
            value={selectedBatchId ? String(selectedBatchId) : 'all'}
            onValueChange={(value) => setSelectedBatchId(value === 'all' ? undefined : parseInt(value))}
          >
            <SelectTrigger className="h-8 w-fit min-w-40">
              <SelectValue placeholder="All Batches" />
            </SelectTrigger>
            <SelectContent className="z-50">
              <SelectItem value="all">All Batches</SelectItem>
              {batchesLoading ? (
                <SelectItem value="loading" disabled>Loading...</SelectItem>
              ) : (
                batches?.map((batch) => (
                  <SelectItem key={batch.id} value={String(batch.id)}>
                    {batch.batchCode} - {batch.batchName}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={selectedStatus || 'all'}
            onValueChange={(value) => setSelectedStatus(value === 'all' ? undefined : value as 'active' | 'dropped' | 'completed')}
          >
            <SelectTrigger className="h-8 w-fit min-w-32">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="z-50">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="dropped">Dropped</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-8 w-8"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* Clear Filters + Active Count */}
          {activeFilterCount > 0 && (
            <>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 h-8">
                <X className="h-4 w-4" />
                Clear
              </Button>
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} active
              </Badge>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-border/60 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{
                      width: header.getSize() !== 150 ? header.getSize() : undefined,
                    }}
                    className="text-xs font-bold text-foreground/70 uppercase tracking-widest"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    style={{
                      width: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined,
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <DataTablePagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={limit}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setLimit(newSize);
          setPage(1);
        }}
        pageSizeOptions={ROWS_PER_PAGE_OPTIONS}
      />
    </div>
  );
}

function TableSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
