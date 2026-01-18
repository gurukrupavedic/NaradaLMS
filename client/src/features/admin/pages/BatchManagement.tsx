import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ColumnDef, SortingState, flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { useBatches, useCreateBatch, useUpdateBatch, useDeleteBatch, Batch } from "../hooks/useBatches";
import { useCoInstructors } from "../hooks/useBatchRelations";
import { useToast } from "@/features/shared/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, AlertCircle, FolderPlus, Trash2, Plus, X } from "lucide-react";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useRoleGuard } from '@/features/shared/hooks/useRoleGuard';

type Track = { id: number; title?: string; name?: string };
type Instructor = { id: string; firstName?: string; lastName?: string; email: string };

export default function BatchManagement() {
  useRoleGuard(['admin']);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);

  const offset = (page - 1) * limit;

  const { data, isLoading, error, refetch } = useBatches({ limit, offset });
  const createBatch = useCreateBatch();
  const updateBatch = useUpdateBatch();
  const deleteBatch = useDeleteBatch();

  const [form, setForm] = useState<Partial<Batch>>({ batchCode: "", batchName: "", trackId: undefined, cohortType: undefined });

  // Fetch tracks to allow associating a batch with a current track
  const { data: tracks = [] } = useQuery<Track[]>({
    queryKey: ["/api/learning/tracks"],
  });

  // Fetch instructors for primary and secondary instructor selection
  const { data: instructorsData } = useQuery<{ users: Instructor[] }>({
    queryKey: ["/api/auth/admin/users"],
    select: (data) => ({
      users: data.users.filter((u: any) => u.roles && u.roles.includes('instructor'))
    })
  });
  const instructors = instructorsData?.users ?? [];

  const [secondaryInstructorIds, setSecondaryInstructorIds] = useState<string[]>([]);
  const [instructorSearch, setInstructorSearch] = useState("");
  const [showInstructorDropdown, setShowInstructorDropdown] = useState(false);
  const [batchDescription, setBatchDescription] = useState("");

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    if (dialogMode === 'create') {
      createBatch.mutate({
        batchCode: form.batchCode,
        batchName: form.batchName,
        trackId: form.trackId ?? undefined,
        cohortType: form.cohortType ?? undefined,
        primaryInstructorId: form.primaryInstructorId ?? undefined,
        description: batchDescription || undefined,
        secondaryInstructorIds: secondaryInstructorIds.length > 0 ? secondaryInstructorIds : undefined,
      }, {
        onSuccess: () => {
          toast({ title: "Batch created", description: "New batch has been created successfully." });
          setForm({ batchCode: "", batchName: "", trackId: undefined, cohortType: undefined, primaryInstructorId: undefined });
          setSecondaryInstructorIds([]);
          setBatchDescription("");
          setInstructorSearch("");
          setShowInstructorDropdown(false);
          setDialogOpen(false);
          setDialogMode('create');
          setEditingBatch(null);
        },
        onError: (err: any) => {
          toast({ title: "Failed to create batch", description: err.message, variant: "destructive" });
        },
      });
    } else if (dialogMode === 'edit' && editingBatch) {
      updateBatch.mutate(
        {
          id: editingBatch.id,
          payload: {
            batchCode: form.batchCode,
            batchName: form.batchName,
            trackId: form.trackId ?? null,
            cohortType: form.cohortType ?? null,
            primaryInstructorId: form.primaryInstructorId ?? null,
            description: batchDescription || null,
            secondaryInstructorIds: secondaryInstructorIds,
          },
        },
        {
          onSuccess: () => {
            toast({ title: "Batch updated", description: "Batch details have been saved." });
            setForm({ batchCode: "", batchName: "", trackId: undefined, cohortType: undefined, primaryInstructorId: undefined });
            setSecondaryInstructorIds([]);
            setBatchDescription("");
            setInstructorSearch("");
            setShowInstructorDropdown(false);
            setDialogOpen(false);
            setDialogMode('create');
            setEditingBatch(null);
          },
          onError: (err: any) => {
            toast({ title: "Failed to update batch", description: err.message, variant: "destructive" });
          },
        }
      );
    }
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
      accessorKey: "cohortType",
      header: "COHORT TYPE",
      cell: ({ row }) => {
        const cohortType = row.original.cohortType;
        if (!cohortType) return <span className="text-muted-foreground">—</span>;
        const label = cohortType === 'bramhachari' ? 'Bramhachari' : 'Grihasta';
        return <span className="text-foreground">{label}</span>;
      },
    },
    {
      accessorKey: "trackId",
      header: "CURRENT TRACK",
      cell: ({ row }) => {
        const trackId = row.original.trackId;
        if (!trackId) return <span className="text-muted-foreground">—</span>;
        const track = tracks.find(t => t.id === trackId);
        const label = track ? (track.title || track.name || `Track ${trackId}`) : `Track ${trackId}`;
        return <span className="text-foreground">{label}</span>;
      },
    },
    {
      accessorKey: "primaryInstructorId",
      header: "PRIMARY INSTRUCTOR",
      cell: ({ row }) => {
        const instructorId = row.original.primaryInstructorId;
        if (!instructorId) return <span className="text-muted-foreground">—</span>;
        const instructor = instructors.find(i => i.id === instructorId);
        if (!instructor) return <span className="text-muted-foreground">—</span>;
        const name = instructor.firstName && instructor.lastName
          ? `${instructor.firstName} ${instructor.lastName}`
          : instructor.email;
        return <span className="text-foreground">{name}</span>;
      },
    },
    {
      id: "secondaryInstructors",
      header: "SECONDARY INSTRUCTOR(S)",
      cell: ({ row }) => (
        <CoInstructorCell batchId={row.original.id} instructors={instructors} />
      ),
    },
    {
      accessorKey: "studentCount",
      header: "STUDENTS",
      cell: ({ row }) => {
        const count = row.original.studentCount ?? 0;
        return <span className="text-foreground">{count}</span>;
      },
      size: 90,
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
            <DropdownMenuContent
              align="end"
              className="bg-white dark:bg-black border border-border shadow-lg min-w-[180px]"
            >
              <DropdownMenuItem asChild>
                <Link href={`/app/admin/batches/${batch.id}`}>
                  View
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(batch)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(batch)}
                className="text-destructive focus:text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [tracks, instructors]);

  const handleEdit = (batch: Batch) => {
    setDialogMode('edit');
    setEditingBatch(batch);
    setForm({
      batchCode: batch.batchCode || "",
      batchName: batch.batchName || "",
      trackId: batch.trackId ?? undefined,
      cohortType: batch.cohortType ?? undefined,
      primaryInstructorId: batch.primaryInstructorId ?? undefined,
    });
    setSecondaryInstructorIds([]);
    setBatchDescription(batch.description || "");
    setInstructorSearch("");
    setShowInstructorDropdown(false);
    setDialogOpen(true);
  };

  // When editing, fetch co-instructors to prefill chips
  const editingBatchId = editingBatch?.id ?? 0;
  const { data: editingCoInstructors } = useCoInstructors(editingBatchId, { enabled: dialogOpen && dialogMode === 'edit' && !!editingBatch });

  React.useEffect(() => {
    if (dialogOpen && dialogMode === 'edit' && editingBatch && editingCoInstructors) {
      const ids = editingCoInstructors.map(ci => ci.instructorId);
      setSecondaryInstructorIds(ids);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, dialogMode, editingBatchId, editingCoInstructors]);

  // Delete handler with validation (throws error if batch has students)
  const handleDelete = (batch: Batch) => {
    if (!confirm(`Are you sure you want to delete batch "${batch.batchName}"? This action cannot be undone.`)) {
      return;
    }

    // Attempt deletion - API will reject if batch has students
    deleteBatch.mutate(batch.id, {
      onSuccess: () => {
        toast({
          title: "Batch deleted",
          description: `"${batch.batchName}" has been permanently deleted.`
        });
      },
      onError: (err: any) => {
        toast({
          title: "Cannot delete batch",
          description: err.message || "Batch has enrolled students. Remove all students before deleting.",
          variant: "destructive"
        });
      },
    });
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
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Fixed Header / Action Button */}
      <div className="flex-shrink-0 px-4 py-4 bg-background z-10">
        <div className="flex items-center justify-end">
          <Button
            onClick={() => {
              setDialogMode('create');
              setEditingBatch(null);
              setForm({ batchCode: "", batchName: "", trackId: undefined, cohortType: undefined, primaryInstructorId: undefined });
              setSecondaryInstructorIds([]);
              setBatchDescription("");
              setInstructorSearch("");
              setShowInstructorDropdown(false);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Batch
          </Button>
        </div>
      </div>

      {/* Create Batch Modal */}
      <CreateBatchDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setDialogMode('create');
            setEditingBatch(null);
            setForm({ batchCode: "", batchName: "", trackId: undefined, cohortType: undefined, primaryInstructorId: undefined });
            setSecondaryInstructorIds([]);
            setBatchDescription("");
            setInstructorSearch("");
            setShowInstructorDropdown(false);
          }
        }}
        title={dialogMode === 'create' ? 'Create New Batch' : 'Edit Batch'}
        description={dialogMode === 'create'
          ? 'Add a new batch to organize students and track their progress.'
          : 'Update batch details.'}
        submitLabel={dialogMode === 'create' ? 'Create Batch' : 'Save Changes'}
        form={form}
        setForm={setForm}
        tracks={tracks}
        instructors={instructors}
        secondaryInstructorIds={secondaryInstructorIds}
        setSecondaryInstructorIds={setSecondaryInstructorIds}
        instructorSearch={instructorSearch}
        setInstructorSearch={setInstructorSearch}
        showInstructorDropdown={showInstructorDropdown}
        setShowInstructorDropdown={setShowInstructorDropdown}
        batchDescription={batchDescription}
        setBatchDescription={setBatchDescription}
        onSubmit={handleSubmit}
        isPending={dialogMode === 'create' ? createBatch.isPending : updateBatch.isPending}
      />

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 px-4">
        <div className="h-full rounded-lg border border-border/60 bg-card overflow-hidden flex flex-col shadow-sm">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load batches</h3>
              <p className="text-sm text-muted-foreground mb-4">There was an error loading the batch data.</p>
              <Button onClick={() => refetch()} variant="outline">
                Retry
              </Button>
            </div>
          ) : batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
              <FolderPlus className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No batches yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Get started by creating your first batch above.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              <Table wrapperClassName="h-full">
                <TableHeader className="bg-white dark:bg-black sticky top-0 z-10">
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
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody className="[&_tr:last-child]:border-b">
                  {table.getRowModel().rows.map(row => (
                    <TableRow
                      key={row.id}
                      className="border-b border-border/60 cursor-pointer hover:bg-muted/50"
                      onClick={(e) => {
                        // Don't navigate if clicking on action buttons or dropdowns
                        const target = e.target as HTMLElement;
                        if (target.closest('button') || target.closest('[role="menuitem"]')) {
                          return;
                        }
                        setLocation(`/app/admin/batches/${row.original.id}`);
                      }}
                    >
                      {row.getVisibleCells().map(cell => (
                        <TableCell
                          key={cell.id}
                          className="py-2"
                          style={{ width: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined }}
                        >
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
      </div>

      {/* Pagination */}
      {!isLoading && !error && batches.length > 0 && (
        <div className="flex-shrink-0">
          <DataTablePagination
            currentPage={page}
            totalPages={totalPages}
            pageSize={limit}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => { setLimit(newSize); setPage(1); }}
          />
        </div>
      )}
    </div>
  );
}

function CoInstructorCell({ batchId, instructors }: { batchId: number; instructors: Instructor[] }) {
  const { data, isLoading, error } = useCoInstructors(batchId);
  if (isLoading) return <span className="text-muted-foreground">Loading…</span>;
  if (error) return <span className="text-muted-foreground">—</span>;
  const items = data || [];
  if (items.length === 0) return <span className="text-muted-foreground">—</span>;
  // Dedupe by instructorId to avoid duplicate display when multiple assignments exist
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

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-input bg-white dark:bg-black text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

interface CreateBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  form: Partial<Batch>;
  setForm: (form: Partial<Batch>) => void;
  tracks: Track[];
  instructors: Instructor[];
  secondaryInstructorIds: string[];
  setSecondaryInstructorIds: (ids: string[]) => void;
  instructorSearch: string;
  setInstructorSearch: (search: string) => void;
  showInstructorDropdown: boolean;
  setShowInstructorDropdown: (show: boolean) => void;
  batchDescription: string;
  setBatchDescription: (desc: string) => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  isPending: boolean;
}

function CreateBatchDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  form,
  setForm,
  tracks,
  instructors,
  secondaryInstructorIds,
  setSecondaryInstructorIds,
  instructorSearch,
  setInstructorSearch,
  showInstructorDropdown,
  setShowInstructorDropdown,
  batchDescription,
  setBatchDescription,
  onSubmit,
  isPending,
}: CreateBatchDialogProps) {
  const filteredInstructors = useMemo(() => {
    if (!instructorSearch) return instructors;
    const search = instructorSearch.toLowerCase();
    return instructors.filter((i) =>
    (i.firstName?.toLowerCase().includes(search) ||
      i.lastName?.toLowerCase().includes(search) ||
      i.email.toLowerCase().includes(search))
    );
  }, [instructors, instructorSearch]);

  const getInstructorLabel = (id: string) => {
    const instructor = instructors.find((i) => i.id === id);
    return instructor
      ? `${instructor.firstName || ""} ${instructor.lastName || ""}`.trim() || instructor.email
      : "Unknown";
  };

  const addSecondaryInstructor = (instructorId: string) => {
    if (!secondaryInstructorIds.includes(instructorId) && secondaryInstructorIds.length < 2) {
      setSecondaryInstructorIds([...secondaryInstructorIds, instructorId]);
    }
  };

  const removeSecondaryInstructor = (instructorId: string) => {
    setSecondaryInstructorIds(secondaryInstructorIds.filter((id) => id !== instructorId));
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl border border-border bg-white dark:bg-black shadow-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <LabeledInput
                label="Batch Code"
                value={form.batchCode || ""}
                onChange={(v) => setForm({ ...form, batchCode: v })}
              />
              <LabeledInput
                label="Batch Name"
                value={form.batchName || ""}
                onChange={(v) => setForm({ ...form, batchName: v })}
              />

              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Primary Instructor {instructors.length > 0 && `(${instructors.length} available)`}
                </span>

                {form.primaryInstructorId ? (
                  <div className="flex items-center justify-between p-2 bg-muted rounded text-sm text-foreground">
                    <span>
                      {getInstructorLabel(form.primaryInstructorId)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, primaryInstructorId: undefined })}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      className="w-full rounded-md border border-input bg-white dark:bg-black text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      value={instructorSearch}
                      onChange={(e) => setInstructorSearch(e.target.value)}
                      onFocus={() => setShowInstructorDropdown(true)}
                      onBlur={() => setTimeout(() => setShowInstructorDropdown(false), 300)}
                    />

                    {showInstructorDropdown && filteredInstructors.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-black border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredInstructors.map((instructor) => (
                          <button
                            key={instructor.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setForm({ ...form, primaryInstructorId: instructor.id });
                              setInstructorSearch("");
                              setShowInstructorDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-muted flex flex-col border-b border-border last:border-b-0"
                          >
                            <span className="text-sm font-medium text-foreground">
                              {instructor.firstName && instructor.lastName
                                ? `${instructor.firstName} ${instructor.lastName}`
                                : instructor.email}
                            </span>
                            {instructor.firstName && instructor.lastName && (
                              <span className="text-xs text-muted-foreground">
                                {instructor.email}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {showInstructorDropdown && instructorSearch && filteredInstructors.length === 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-black border border-border rounded-md shadow-lg p-3">
                        <p className="text-sm text-muted-foreground">No instructors found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">
                  Secondary Instructors (up to 2)
                </span>
                {secondaryInstructorIds.length < 2 && (
                  <div className="mt-1">
                    <select
                      className="w-full rounded-md border border-input bg-white dark:bg-black text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      onChange={(e) => {
                        if (e.target.value) {
                          addSecondaryInstructor(e.target.value);
                          e.target.value = "";
                        }
                      }}
                      value=""
                    >
                      <option value="">+ Add secondary instructor</option>
                      {instructors
                        .filter(
                          (i) =>
                            i.id !== form.primaryInstructorId &&
                            !secondaryInstructorIds.includes(i.id)
                        )
                        .map((instructor) => (
                          <option key={instructor.id} value={instructor.id}>
                            {instructor.firstName || ""} {instructor.lastName || ""} ({instructor.email})
                          </option>
                        ))}
                    </select>
                  </div>
                )}
                {secondaryInstructorIds.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {secondaryInstructorIds.map((id) => (
                      <div
                        key={id}
                        className="flex items-center justify-between p-2 bg-muted rounded text-sm text-foreground"
                      >
                        <span>{getInstructorLabel(id)}</span>
                        <button
                          type="button"
                          onClick={() => removeSecondaryInstructor(id)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </label>

              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">
                  Cohort Type (optional)
                </span>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-white dark:bg-black text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.cohortType ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm({ ...form, cohortType: v || undefined });
                  }}
                >
                  <option value="">— Select cohort type —</option>
                  <option value="bramhachari">Bramhachari</option>
                  <option value="grihasta">Grihasta</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">
                  Current Track (optional)
                </span>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-white dark:bg-black text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.trackId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm({ ...form, trackId: v ? parseInt(v) : undefined });
                  }}
                >
                  <option value="">— Select track —</option>
                  {tracks.map((t) => {
                    const label = t.title || t.name || `Track ${t.id}`;
                    return (
                      <option key={t.id} value={t.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>

            {/* Right Column - Description */}
            <div className="flex flex-col h-full relative">
              <div className="absolute left-0 top-0 bottom-0 border-l border-border"></div>
              <div className="pl-6 flex flex-col h-full">
                <label className="block flex flex-col h-full">
                  <span className="text-xs font-medium text-muted-foreground mb-2">
                    Batch Description (optional)
                  </span>
                  <textarea
                    className="flex-1 w-full rounded-md border border-input bg-white dark:bg-black text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-64"
                    placeholder="Enter batch description..."
                    value={batchDescription}
                    onChange={(e) => setBatchDescription(e.target.value.slice(0, 1000))}
                    maxLength={1000}
                  />
                  <div className="mt-2 text-xs text-muted-foreground text-right">
                    {batchDescription.length} / 1000
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !form.batchCode || !form.batchName || !form.primaryInstructorId}
            >
              {isPending ? "Saving..." : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
