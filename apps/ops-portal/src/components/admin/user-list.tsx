'use client';

import React, { useMemo, useState, useEffect } from "react";
import {
    ColumnDef,
    Column,
    SortingState,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import {
    useAdminUsers,
    useApproveUser,
    useRejectUser,
    useAssignRoles,
    useUserStatusMutation,
    AdminUser,
} from "@/lib/hooks/useAdminUsers";
import {
    Button,
    cn,
    Input,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Badge,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    Label,
    Tabs,
    TabsList,
    TabsTrigger,
    DataTablePagination,
} from "@narada/ui";
import { RefreshCw, MoreVertical, Check, X, AlertCircle, Users } from "lucide-react";
import { ArrowUpDown } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
    admin: "Admin",
    instructor: "Instructor",
    content_manager: "Content Manager",
    student: "Student",
};

const ALL_ROLES = ["student", "instructor", "content_manager", "admin"] as const;

const DEFAULT_COUNTS = { all: 0, pending_approval: 0, active: 0, inactive: 0 };

function formatName(u: AdminUser) {
    return [u.firstName, u.lastName].filter(Boolean).join(" ") || "User";
}

function SortableHeader({ column, label }: { column: Column<AdminUser>; label: string }) {
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

export default function UserList() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [sorting, setSorting] = useState<SortingState>([]);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editingRoles, setEditingRoles] = useState<string[]>([]);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    const offset = (page - 1) * limit;

    const { data, isLoading, error, refetch, isRefetching } = useAdminUsers({
        limit,
        offset,
        status: statusFilter === "all" ? undefined : statusFilter,
        search: debouncedSearch || undefined,
    });

    const approve = useApproveUser();
    const reject = useRejectUser();
    const assignRoles = useAssignRoles();
    const statusMutation = useUserStatusMutation();

    const users = data?.users ?? [];
    const pagination = data?.pagination;
    const statusCounts = data?.statusCounts ?? DEFAULT_COUNTS;
    const total = pagination?.total ?? users.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const startRoleEdit = (user: AdminUser) => {
        if (user.status === "pending_approval") return;
        setEditingUserId(user.id);
        setEditingRoles(user.roles ?? []);
    };

    const cancelRoleEdit = () => {
        setEditingUserId(null);
        setEditingRoles([]);
    };

    const handleApprove = (userId: string) => {
        approve.mutate(userId, { onSuccess: () => refetch() });
    };

    const handleReject = (userId: string) => {
        if (!confirm("Are you sure?")) return;
        reject.mutate(userId, { onSuccess: () => refetch() });
    };

    const handleAssignRoles = (userId: string) => {
        assignRoles.mutate({ userId, roles: editingRoles }, { onSuccess: () => cancelRoleEdit() });
    };

    const handleToggleStatus = (user: AdminUser) => {
        statusMutation.mutate(
            {
                userId: user.id,
                action: user.status === "inactive" ? "enable" : "disable",
            },
            { onSuccess: () => refetch() }
        );
    };

    const columns: ColumnDef<AdminUser>[] = useMemo(
        () => [
            {
                id: "name",
                accessorFn: (row) => formatName(row),
                header: ({ column }) => <SortableHeader column={column} label="Name" />,
                cell: ({ row }) => (
                    <span className="text-sm font-medium text-foreground">{formatName(row.original)}</span>
                ),
            },
            {
                accessorKey: "email",
                header: ({ column }) => <SortableHeader column={column} label="Email" />,
                cell: ({ row }) => (
                    <span className="text-sm text-muted-foreground">{row.original.email}</span>
                ),
            },
            {
                accessorKey: "status",
                header: ({ column }) => <SortableHeader column={column} label="Status" />,
                cell: ({ row }) => {
                    const status = row.original.status;
                    const variant =
                        status === "active"
                            ? "default"
                            : status === "inactive"
                              ? "secondary"
                              : "outline";
                    return (
                        <Badge variant={variant}>
                            {status === "pending_approval" ? "Pending" : status}
                        </Badge>
                    );
                },
            },
            {
                accessorKey: "roles",
                header: ({ column }) => <SortableHeader column={column} label="Roles" />,
                cell: ({ row }) => {
                    const roles = row.original.roles ?? [];
                    if (roles.length === 0) return <span className="text-sm text-muted-foreground">—</span>;
                    return (
                        <div className="flex flex-wrap gap-1">
                            {roles.map((r) => (
                                <Badge
                                    key={r}
                                    variant="secondary"
                                    className="text-xs font-normal"
                                >
                                    {ROLE_LABELS[r] || r}
                                </Badge>
                            ))}
                        </div>
                    );
                },
            },
            {
                id: "actions",
                cell: ({ row }) => {
                    const user = row.original;
                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Actions">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {user.status === "pending_approval" ? (
                                    <>
                                        <DropdownMenuItem
                                            onClick={() => handleApprove(user.id)}
                                        >
                                            <Check className="mr-2 h-4 w-4" /> Approve
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleReject(user.id)}>
                                            <X className="mr-2 h-4 w-4" /> Reject
                                        </DropdownMenuItem>
                                    </>
                                ) : (
                                    <>
                                        <DropdownMenuItem onClick={() => startRoleEdit(user)}>
                                            Edit Roles
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => handleToggleStatus(user)}
                                        >
                                            {user.status === "inactive"
                                                ? "Enable"
                                                : "Disable"}
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                },
            },
        ],
        []
    );

    const table = useReactTable({
        data: users,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    const hasData = !isLoading && !error && users.length > 0;

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {/* Toolbar: tabs with counts, search, refresh */}
            <div
                className="flex flex-shrink-0 flex-wrap items-center gap-3 py-3"
                role="group"
                aria-label="User filters"
            >
                <Tabs
                    value={statusFilter}
                    onValueChange={(v) => {
                        setStatusFilter(v);
                        setPage(1);
                    }}
                >
                    <TabsList className="bg-muted/50">
                        <TabsTrigger value="all">
                            All {statusCounts.all}
                        </TabsTrigger>
                        <TabsTrigger value="pending_approval">
                            Pending {statusCounts.pending_approval}
                        </TabsTrigger>
                        <TabsTrigger value="active">
                            Active {statusCounts.active}
                        </TabsTrigger>
                        <TabsTrigger value="inactive">
                            Inactive {statusCounts.inactive}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <Input
                    type="search"
                    placeholder="Search users…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="h-9 w-[200px] shrink-0 bg-card"
                    aria-label="Search users"
                />

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isLoading || isRefetching}
                    aria-label="Refresh"
                >
                    <RefreshCw
                        className={`h-4 w-4 shrink-0 ${isRefetching ? "animate-spin" : ""}`}
                        aria-hidden
                    />
                </Button>
            </div>

            {/* Edit roles dialog */}
            <Dialog
                open={editingUserId !== null}
                onOpenChange={(open) => !open && cancelRoleEdit()}
            >
                <DialogContent
                    className="sm:max-w-[420px] sm:rounded-xl shadow-xl border-border"
                    aria-describedby="edit-roles-description"
                >
                    {editingUserId && (() => {
                        const editingUser = users.find((u) => u.id === editingUserId);
                        return (
                            <>
                                <DialogHeader className="space-y-2">
                                    <DialogTitle className="text-lg font-semibold tracking-tight">
                                        Edit roles
                                    </DialogTitle>
                                    <DialogDescription id="edit-roles-description">
                                        Select the roles to assign. Changes take effect immediately after saving.
                                    </DialogDescription>
                                </DialogHeader>

                                {editingUser && (
                                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                                        <p className="text-sm font-semibold text-foreground">
                                            {formatName(editingUser)}
                                        </p>
                                        {editingUser.email && (
                                            <p className="mt-0.5 text-sm text-muted-foreground">
                                                {editingUser.email}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Roles
                                    </p>
                                    <div className="rounded-lg border border-border bg-muted/20 p-1.5">
                                        {ALL_ROLES.map((role) => {
                                            const isChecked = editingRoles.includes(role);
                                            return (
                                                <Label
                                                    key={role}
                                                    className={cn(
                                                        "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm font-normal transition-colors hover:bg-muted/50",
                                                        isChecked && "bg-muted/50"
                                                    )}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() =>
                                                            setEditingRoles((r) =>
                                                                r.includes(role)
                                                                    ? r.filter((x) => x !== role)
                                                                    : [...r, role]
                                                            )}
                                                        className="h-4 w-4 rounded border border-input accent-primary"
                                                        aria-label={ROLE_LABELS[role]}
                                                    />
                                                    {ROLE_LABELS[role]}
                                                </Label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <DialogFooter className="flex flex-row justify-end gap-2 pt-2 sm:pt-0">
                                    <Button variant="outline" onClick={cancelRoleEdit}>
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            handleAssignRoles(editingUserId);
                                        }}
                                    >
                                        Save
                                    </Button>
                                </DialogFooter>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {/* Content: loading / error / empty or table + pagination */}
            {isLoading ? (
                <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 text-muted-foreground py-12">
                    <div
                        className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"
                        aria-hidden
                    />
                    <p className="text-sm">Loading users…</p>
                </div>
            ) : error ? (
                <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 text-destructive py-12">
                    <AlertCircle className="h-8 w-8" aria-hidden />
                    <p className="text-sm">Failed to load users. Please try again.</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Retry
                    </Button>
                </div>
            ) : users.length === 0 ? (
                <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-2 text-muted-foreground py-12 max-w-sm text-center">
                    <Users className="h-10 w-10 opacity-20" aria-hidden />
                    <p className="text-sm font-medium">No users found</p>
                    <p className="text-sm">Try adjusting your filters or search.</p>
                </div>
            ) : (
                <>
                    <div className="flex min-h-0 flex-1 flex-col rounded-md border overflow-hidden">
                        <Table
                            className="w-full [&_th]:h-9 [&_th]:py-1.5 [&_th]:px-3 [&_td]:py-1.5 [&_td]:px-3"
                            scrollContainerStyle={{ height: "100%" }}
                        >
                            <TableHeader className="sticky top-0 z-10 bg-muted [&_tr]:border-b">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead key={header.id}>
                                                {flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody className="[&_tr]:bg-card">
                                {table.getRowModel().rows.map((row) => (
                                    <TableRow key={row.id}>
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
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
