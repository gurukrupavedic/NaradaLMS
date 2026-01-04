import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  ColumnDef,
  PaginationState,
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
import { ChevronLeft, ChevronRight, Users, Search, X, Filter } from 'lucide-react';
import { MyStudent } from '@shared/types';
import { useMyStudents } from '../hooks/useMyStudents';
import { useInstructorBatches } from '../hooks/useInstructorBatches';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Breadcrumb, type BreadcrumbItem } from '@/components/design-system/Breadcrumb';

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function MyStudentsPage() {
  const [, navigate] = useLocation();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Filter state
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<number | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'dropped' | 'completed' | undefined>('active');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPagination(prev => ({ ...prev, pageIndex: 0 })); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset to page 0 when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [selectedBatchId, selectedStatus]);

  const offset = pagination.pageIndex * pagination.pageSize;
  const { data, isLoading, isError, error, refetch } = useMyStudents({
    limit: pagination.pageSize,
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
  };

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
        header: '',
        cell: ({ row }) => (
          <div className="text-right">
            <button 
              className="text-muted-foreground hover:text-foreground"
              aria-label="More actions"
            >
              ⋮
            </button>
          </div>
        ),
        size: 50,
      },
    ],
    [navigate]
  );

  // Create table instance
  const table = useReactTable({
    data: data?.items || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    pageCount: data ? Math.ceil(data.pagination.total / pagination.pageSize) : 0,
  });

  // Loading state - skeleton loader
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="px-4 py-2">
          <Breadcrumb
            items={[
              { label: 'Batches & Progress', href: '/app/instructor/batches' },
              { label: 'My Students', active: true },
            ]}
            variant="blue"
            size="sm"
          />
        </div>
        <div className="flex items-center justify-between px-4">
          <div>
            <h1 className="text-2xl font-bold">My Students</h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead style={{ width: '100px' }}>ROLL#</TableHead>
                <TableHead style={{ width: '200px' }}>NAME</TableHead>
                <TableHead style={{ width: '200px' }}>CONTACT</TableHead>
                <TableHead style={{ width: '150px' }}>TIMEZONE</TableHead>
                <TableHead style={{ width: '120px' }}>TYPE</TableHead>
                <TableHead style={{ width: '250px' }}>BATCH</TableHead>
                <TableHead style={{ width: '50px' }}></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(4)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-4">
        <div className="px-4 py-2">
          <Breadcrumb
            items={[
              { label: 'Batches & Progress', href: '/app/instructor/batches' },
              { label: 'My Students', active: true },
            ]}
            variant="blue"
            size="sm"
          />
        </div>
        <div className="flex items-center justify-between px-4">
          <div>
            <h1 className="text-2xl font-bold">My Students</h1>
            <p className="text-muted-foreground">Error loading students</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 border border-red-200 bg-red-50 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <p className="font-medium text-red-900">
              {error instanceof Error ? error.message : 'Failed to load students'}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="ml-auto"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data?.items || data.items.length === 0) {
    return (
      <div className="space-y-4">
        <div className="px-4 py-2">
          <Breadcrumb
            items={[
              { label: 'Batches & Progress', href: '/app/instructor/batches' },
              { label: 'My Students', active: true },
            ]}
            variant="blue"
            size="sm"
          />
        </div>
        <div className="flex items-center justify-between px-4">
          <div>
            <h1 className="text-2xl font-bold">My Students</h1>
            <p className="text-muted-foreground">
              {activeFilterCount > 0 ? `No results with current filters` : 'Manage students across your batches'}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-muted/50">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          {activeFilterCount > 0 ? (
            <>
              <h3 className="font-semibold mb-1">No students match your filters</h3>
              <p className="text-muted-foreground text-center text-sm mb-4">
                Try adjusting your search or filter criteria
              </p>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </>
          ) : (
            <>
              <h3 className="font-semibold mb-1">No students yet</h3>
              <p className="text-muted-foreground text-center text-sm">
                You don't have any students in your batches yet. Enroll students in your batches to see them here.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Success state - render table
  return (
    <div className="space-y-4">
      <div className="px-4 py-2">
        <Breadcrumb
          items={[
            { label: 'Batches & Progress', href: '/app/instructor/batches' },
            { label: 'My Students', active: true },
          ]}
          variant="blue"
          size="sm"
        />
      </div>
      <div className="flex items-center justify-between px-4">
        <div>
          <h1 className="text-2xl font-bold">My Students</h1>
          <p className="text-muted-foreground">
            {data.pagination.total} student{data.pagination.total !== 1 ? 's' : ''}
            {activeFilterCount > 0 && (
              <span className="ml-2 text-blue-600">
                ({activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="px-4 flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-9"
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
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Batches" />
          </SelectTrigger>
          <SelectContent>
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
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="dropped">Dropped</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters Button */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        )}

        {/* Active Filter Badge */}
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="ml-auto">
            <Filter className="h-3 w-3 mr-1" />
            {activeFilterCount}
          </Badge>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{
                      width: header.getSize(),
                    }}
                    className="text-xs font-semibold uppercase text-muted-foreground px-4 py-3"
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
              <TableRow key={row.id} className="border-b hover:bg-muted/50">
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    style={{
                      width: cell.column.getSize(),
                    }}
                    className="px-4 py-3 text-sm"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROWS_PER_PAGE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
