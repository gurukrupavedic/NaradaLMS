import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ColumnDef, SortingState, flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { useBatches, useCreateBatch, useUpdateBatch, Batch } from "../hooks/useBatches";
import { useToast } from "@/features/shared-features/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, AlertCircle, FolderPlus, Trash2 } from "lucide-react";

type Track = { id: number; title?: string; name?: string };

export default function BatchManagement() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sorting, setSorting] = useState<SortingState>([]);

  const offset = (page - 1) * limit;

  const { data, isLoading, error, refetch } = useBatches({ limit, offset });
  const createBatch = useCreateBatch();
  const updateBatch = useUpdateBatch();

  const [form, setForm] = useState<Partial<Batch>>({ batchCode: "", batchName: "", trackId: undefined });

  // Fetch tracks to allow associating a batch with a current track
  const { data: tracks = [] } = useQuery<Track[]>({
    queryKey: ["/api/learning/tracks"],
  });

  const submitCreate: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    createBatch.mutate({ batchCode: form.batchCode, batchName: form.batchName, trackId: form.trackId ?? undefined }, {
      onSuccess: () => {
        toast({ title: "Batch created", description: "New batch has been created successfully." });
        setForm({ batchCode: "", batchName: "", trackId: undefined });
        refetch();
      },
      onError: (err: any) => {
        toast({ title: "Failed to create batch", description: err.message, variant: "destructive" });
      },
    });
  };

  const batches = data?.items ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Define columns for TanStack Table (simplified: Code, Name, Track, Actions)
  const columns = useMemo<ColumnDef<Batch>[]>(() => [
    {
      accessorKey: "batchCode",
      header: "CODE",
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.batchCode}</span>
      ),
    },
    {
      accessorKey: "batchName",
      header: "NAME",
      cell: ({ row }) => (
        <span className="text-foreground">{row.original.batchName}</span>
      ),
    },
    {
      accessorKey: "trackId",
      header: "TRACK",
      cell: ({ row }) => {
        const trackId = row.original.trackId;
        if (!trackId) return <span className="text-muted-foreground">—</span>;
        const track = tracks.find(t => t.id === trackId);
        const label = track ? (track.title || track.name || `Track ${trackId}`) : `Track ${trackId}`;
        return <span className="text-foreground">{label}</span>;
      },
    },
    {
      id: "actions",
      header: "ACTIONS",
      cell: ({ row }) => {
        const batch = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(batch)}>
                Edit Batch
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/app/admin/batches/${batch.id}`}>
                  Manage Students
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDelete(batch)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [tracks]);

  // Edit handler (will implement dialog later)
  const handleEdit = (batch: Batch) => {
    toast({ title: "Edit feature", description: "Edit dialog will be implemented next." });
  };

  // Delete handler with validation (throws error if batch has students)
  const handleDelete = (batch: Batch) => {
    if (!confirm(`Are you sure you want to delete batch "${batch.batchName}"? This action cannot be undone.`)) {
      return;
    }

    // Attempt deletion - API will reject if batch has students
    updateBatch.mutate(
      { id: batch.id, payload: { deleted: true } },
      {
        onSuccess: () => {
          toast({ 
            title: "Batch deleted", 
            description: `"${batch.batchName}" has been permanently deleted.` 
          });
          refetch();
        },
        onError: (err: any) => {
          toast({ 
            title: "Cannot delete batch", 
            description: err.message || "Batch has enrolled students. Remove all students before deleting.",
            variant: "destructive" 
          });
        },
      }
    );
  };

  // TanStack Table setup
  const table = useReactTable({
    data: batches,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  return (
    <div className="space-y-6 px-4">
      {/* Create Batch Form */}
      <form onSubmit={submitCreate} className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-base font-semibold text-foreground">Create Batch</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <LabeledInput label="Batch Code" value={form.batchCode || ""} onChange={(v) => setForm(f => ({ ...f, batchCode: v }))} />
          <LabeledInput label="Batch Name" value={form.batchName || ""} onChange={(v) => setForm(f => ({ ...f, batchName: v }))} />
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Current Track (optional)</span>
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={form.trackId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setForm(f => ({ ...f, trackId: v ? parseInt(v) : undefined }));
              }}
            >
              <option value="">— Select track —</option>
              {tracks.map(t => {
                const label = t.title || t.name || `Track ${t.id}`;
                return <option key={t.id} value={t.id}>{label}</option>;
              })}
            </select>
          </label>
        </div>
        <div className="mt-4">
          <Button type="submit" disabled={createBatch.isPending || !form.batchCode || !form.batchName}>
            {createBatch.isPending ? "Creating..." : "Create Batch"}
          </Button>
        </div>
      </form>

      {/* Table */}
      <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load batches</h3>
            <p className="text-sm text-muted-foreground mb-4">There was an error loading the batch data.</p>
            <Button onClick={() => refetch()} variant="outline">
              Retry
            </Button>
          </div>
        ) : batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FolderPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No batches yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Get started by creating your first batch above.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
                  {headerGroup.headers.map(header => (
                    <TableHead key={header.id} className="text-[11px] uppercase tracking-wide font-semibold">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map(row => (
                <TableRow key={row.id} className="border-t border-border">
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && !error && batches.length > 0 && (
        <div className="flex items-center justify-end gap-4 px-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page</span>
            <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input 
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
      />
    </label>
  );
}
