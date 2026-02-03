'use client';
import React, { useMemo, useState } from "react";
import { ColumnDef, SortingState, flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import Link from "next/link"; // Next.js Link
import { useBatches, useCreateBatch, useUpdateBatch, useDeleteBatch, Batch } from "@/lib/hooks/useBatches";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@narada/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@narada/ui";
import { DataTablePagination } from "@narada/ui";
import { MoreVertical, Plus, X, RefreshCw } from "lucide-react";

// --- Components ---

function CoInstructorCell({ batchId, instructors }: { batchId: number; instructors: Instructor[] }) {
    const { data, isLoading, error } = useCoInstructors(batchId);
    if (isLoading) return <span className="text-muted-foreground">Loading…</span>;
    if (error) return <span className="text-muted-foreground">—</span>;
    const items = data || [];
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

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <label className="block">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <input
                className="mt-1 w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </label>
    );
}

// Simplified CreateBatchDialog for MVP port
function BatchDialog({
    open,
    onOpenChange,
    onSubmit,
    isPending,
    initialData,
    mode,
    instructors
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: any) => void;
    isPending: boolean;
    initialData?: Partial<Batch> | null;
    mode: 'create' | 'edit';
    instructors: Instructor[];
}) {
    const [form, setForm] = useState<Partial<Batch>>({ batchCode: "", batchName: "", primaryInstructorId: undefined, ...initialData });

    // Reset form when opening create
    React.useEffect(() => {
        if (open && mode === 'create') {
            setForm({ batchCode: "", batchName: "", primaryInstructorId: undefined });
        } else if (open && mode === 'edit' && initialData) {
            setForm(initialData);
        }
    }, [open, mode, initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(form);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{mode === 'create' ? 'Create Batch' : 'Edit Batch'}</DialogTitle>
                    <DialogDescription>
                        {mode === 'create' ? 'Add a new batch.' : 'Update batch details.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <LabeledInput
                        label="Batch Code"
                        value={form.batchCode || ""}
                        onChange={v => setForm(f => ({ ...f, batchCode: v }))}
                    />
                    <LabeledInput
                        label="Batch Name"
                        value={form.batchName || ""}
                        onChange={v => setForm(f => ({ ...f, batchName: v }))}
                    />

                    <label className="block">
                        <span className="text-xs font-medium text-muted-foreground">Primary Instructor</span>
                        <select
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={form.primaryInstructorId || ""}
                            onChange={e => setForm(f => ({ ...f, primaryInstructorId: e.target.value || undefined }))}
                        >
                            <option value="">Select Instructor</option>
                            {instructors.map(i => (
                                <option key={i.id} value={i.id}>
                                    {i.firstName} {i.lastName} ({i.email})
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isPending}>{isPending ? 'Saving...' : 'Save'}</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function BatchList() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [sorting, setSorting] = useState<SortingState>([]);
    const offset = (page - 1) * limit;

    // Data fetching
    const { data, isLoading, error, refetch, isRefetching } = useBatches({ limit, offset });
    const { data: instructors = [] } = useInstructors();

    const createBatch = useCreateBatch();
    const updateBatch = useUpdateBatch();
    const deleteBatch = useDeleteBatch();

    // Dialog State
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
    const [editingBatch, setEditingBatch] = useState<Batch | null>(null);

    const batches = data?.items ?? [];
    const pagination = data?.pagination;
    const total = pagination?.total ?? batches.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const handleOpenCreate = () => {
        setDialogMode('create');
        setEditingBatch(null);
        setDialogOpen(true);
    };

    const handleEdit = (batch: Batch) => {
        setDialogMode('edit');
        setEditingBatch(batch);
        setDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure?")) return;
        deleteBatch.mutate(id);
    };

    const handleFormSubmit = (formData: Partial<Batch>) => {
        if (dialogMode === 'create') {
            createBatch.mutate(formData, { onSuccess: () => setDialogOpen(false) });
        } else if (editingBatch) {
            updateBatch.mutate({ id: editingBatch.id, payload: formData }, { onSuccess: () => setDialogOpen(false) });
        }
    };

    const columns: ColumnDef<Batch>[] = [
        {
            accessorKey: "batchCode",
            header: "Code",
            cell: ({ row }) => <span className="font-medium">{row.original.batchCode}</span>,
        },
        {
            accessorKey: "batchName",
            header: "Name",
        },
        {
            accessorKey: "primaryInstructorId",
            header: "Primary Instructor",
            cell: ({ row }) => {
                const id = row.original.primaryInstructorId;
                const inst = instructors.find(i => i.id === id);
                return inst ? `${inst.firstName} ${inst.lastName}` : id || '-';
            }
        },
        {
            id: "coInstructors",
            header: "Co-Instructors",
            cell: ({ row }) => <CoInstructorCell batchId={row.original.id} instructors={instructors} />
        },
        {
            accessorKey: "studentCount",
            header: "Students",
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const batch = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(batch)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(batch.id)} className="text-destructive">Delete</DropdownMenuItem>
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
                <Button onClick={handleOpenCreate}><Plus className="h-4 w-4 mr-2" /> Create Batch</Button>
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
                                <TableRow key={row.id}>
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

            <BatchDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                mode={dialogMode}
                initialData={editingBatch}
                onSubmit={handleFormSubmit}
                isPending={createBatch.isPending || updateBatch.isPending}
                instructors={instructors}
            />
        </div>
    );
}
