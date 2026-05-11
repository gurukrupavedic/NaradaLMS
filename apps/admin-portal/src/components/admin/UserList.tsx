'use client';

import React, { useState, useEffect } from "react";
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
    useApproveMembership,
    useRejectMembership,
    usePatchMembershipRoles,
    useMembershipEnableDisable,
    GovernanceUser,
    GovernanceMembership,
} from "@/lib/hooks/useAdminUsers";
import { useAuth } from "@/hooks/useAuth";
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
import { RefreshCw, MoreVertical, Check, X, AlertCircle, Users, ShieldAlert } from "lucide-react";
import { ArrowUpDown } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
    admin: "Admin",
    instructor: "Instructor",
    student: "Student",
};

const ALL_ROLES = ["student", "instructor", "admin"] as const;

const DEFAULT_COUNTS = {
    all: 0,
    pending_approval: 0,
    active: 0,
    inactive: 0,
    rejected: 0,
};

const STATUS_TAB_TRIGGER_CLASS =
    "cursor-pointer hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm";

function formatName(u: GovernanceUser) {
    return [u.firstName, u.lastName].filter(Boolean).join(" ") || "User";
}

function membershipSummary(u: GovernanceUser): string {
    const m = u.memberships ?? [];
    if (m.length === 0) return "—";
    return m.map((row) => `${row.orgSlug}: ${row.status}`).join(" · ");
}

function rolesSummary(u: GovernanceUser): string {
    const m = u.memberships ?? [];
    if (m.length === 0) return "";
    return m
        .map((row) => `${row.orgSlug}: ${(row.roles ?? []).map((r) => ROLE_LABELS[r] || r).join(", ")}`)
        .join(" · ");
}

function SortableHeader({ column, label }: { column: Column<GovernanceUser>; label: string }) {
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
    const { user: sessionUser, isLoading: authLoading } = useAuth();
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [sorting, setSorting] = useState<SortingState>([]);
    const [editingMembershipId, setEditingMembershipId] = useState<string | null>(null);
    const [editingOrgLabel, setEditingOrgLabel] = useState("");
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

    const approve = useApproveMembership();
    const reject = useRejectMembership();
    const patchRoles = usePatchMembershipRoles();
    const membershipToggle = useMembershipEnableDisable();

    const users = data?.users ?? [];
    const pagination = data?.pagination;
    const statusCounts = data?.statusCounts ?? DEFAULT_COUNTS;
    const total = pagination?.total ?? users.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const startRoleEdit = (membership: GovernanceMembership) => {
        if (membership.status !== "active") return;
        setEditingMembershipId(membership.membershipId);
        setEditingOrgLabel(`${membership.orgName} (${membership.orgSlug})`);
        setEditingRoles([...(membership.roles ?? [])]);
    };

    const cancelRoleEdit = () => {
        setEditingMembershipId(null);
        setEditingOrgLabel("");
        setEditingRoles([]);
    };

    const handleApprove = (membershipId: string) => {
        approve.mutate(membershipId, { onSuccess: () => refetch() });
    };

    const handleReject = (membershipId: string) => {
        if (!confirm("Reject this membership request?")) return;
        reject.mutate(membershipId, { onSuccess: () => refetch() });
    };

    const handleAssignRoles = () => {
        if (!editingMembershipId) return;
        patchRoles.mutate(
            { membershipId: editingMembershipId, roles: editingRoles },
            { onSuccess: () => cancelRoleEdit() }
        );
    };

    const handleMembershipToggle = (membershipId: string, action: "enable" | "disable") => {
        membershipToggle.mutate({ membershipId, action }, { onSuccess: () => refetch() });
    };

    const columns: ColumnDef<GovernanceUser>[] = [
            {
                id: "name",
                accessorFn: (row) => formatName(row),
                header: ({ column }) => <SortableHeader column={column} label="Name" />,
                cell: ({ row }) => (
                    <span
                        className="min-w-0 truncate block font-medium text-foreground"
                        title={formatName(row.original)}
                    >
                        {formatName(row.original)}
                    </span>
                ),
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
                id: "memberships",
                accessorFn: (row) => membershipSummary(row),
                header: "Memberships",
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground line-clamp-2" title={membershipSummary(row.original)}>
                        {membershipSummary(row.original)}
                    </span>
                ),
            },
            {
                id: "roles",
                accessorFn: (row) => rolesSummary(row),
                header: "Org roles",
                cell: ({ row }) => {
                    const text = rolesSummary(row.original);
                    if (!text) return <span className="text-sm text-muted-foreground">—</span>;
                    return (
                        <span className="min-w-0 truncate block text-sm" title={text}>
                            {text}
                        </span>
                    );
                },
            },
            {
                accessorKey: "legacyStatus",
                header: ({ column }) => <SortableHeader column={column} label="Account" />,
                cell: ({ row }) => {
                    const status = row.original.legacyStatus;
                    const variant =
                        status === "active"
                            ? "default"
                            : status === "inactive"
                              ? "secondary"
                              : "outline";
                    return (
                        <Badge variant={variant}>
                            {status === "pending_approval" ? "legacy pending" : status}
                        </Badge>
                    );
                },
            },
            {
                id: "actions",
                cell: ({ row }) => {
                    const user = row.original;
                    const memberships = user.memberships ?? [];
                    return (
                        <div className="whitespace-nowrap">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" aria-label="Actions">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-[12rem]">
                                    {memberships.map((m) => (
                                        <React.Fragment key={m.membershipId}>
                                            {m.status === "pending" ? (
                                                <>
                                                    <DropdownMenuItem
                                                        onClick={() => handleApprove(m.membershipId)}
                                                    >
                                                        <Check className="mr-2 h-4 w-4" /> Approve ({m.orgSlug})
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleReject(m.membershipId)}
                                                    >
                                                        <X className="mr-2 h-4 w-4" /> Reject ({m.orgSlug})
                                                    </DropdownMenuItem>
                                                </>
                                            ) : null}
                                            {m.status === "active" ? (
                                                <>
                                                    <DropdownMenuItem onClick={() => startRoleEdit(m)}>
                                                        Edit roles ({m.orgSlug})
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleMembershipToggle(m.membershipId, "disable")
                                                        }
                                                    >
                                                        Disable ({m.orgSlug})
                                                    </DropdownMenuItem>
                                                </>
                                            ) : null}
                                            {m.status === "inactive" ? (
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        handleMembershipToggle(m.membershipId, "enable")
                                                    }
                                                >
                                                    Enable ({m.orgSlug})
                                                </DropdownMenuItem>
                                            ) : null}
                                        </React.Fragment>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    );
                },
            },
        ];

    const table = useReactTable({
        data: users,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    if (authLoading) {
        return (
            <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 text-muted-foreground py-12">
                <div
                    className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"
                    aria-hidden
                />
                <p className="text-sm">Checking permissions…</p>
            </div>
        );
    }

    if (!sessionUser?.isSuperAdmin) {
        return (
            <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 px-6 py-12 text-center text-muted-foreground">
                <ShieldAlert className="h-10 w-10 text-amber-600" aria-hidden />
                <p className="text-sm font-medium text-foreground">Super-admin only</p>
                <p className="max-w-md text-sm">
                    User management and membership approval are restricted to platform super-admins.
                </p>
            </div>
        );
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
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
                    <TabsList className="bg-muted/50 border border-border rounded-lg p-1 flex flex-wrap h-auto gap-1">
                        <TabsTrigger value="all" className={STATUS_TAB_TRIGGER_CLASS}>
                            All {statusCounts.all}
                        </TabsTrigger>
                        <TabsTrigger value="pending_approval" className={STATUS_TAB_TRIGGER_CLASS}>
                            Pending {statusCounts.pending_approval}
                        </TabsTrigger>
                        <TabsTrigger value="active" className={STATUS_TAB_TRIGGER_CLASS}>
                            Active {statusCounts.active}
                        </TabsTrigger>
                        <TabsTrigger value="inactive" className={STATUS_TAB_TRIGGER_CLASS}>
                            Inactive {statusCounts.inactive}
                        </TabsTrigger>
                        <TabsTrigger value="rejected" className={STATUS_TAB_TRIGGER_CLASS}>
                            Rejected {statusCounts.rejected}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="ml-auto flex items-center gap-3">
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
            </div>

            <Dialog
                open={editingMembershipId !== null}
                onOpenChange={(open) => !open && cancelRoleEdit()}
            >
                <DialogContent
                    className="sm:max-w-[420px] sm:rounded-xl shadow-xl border-border"
                    aria-describedby="edit-roles-description"
                >
                    {editingMembershipId && (
                        <>
                            <DialogHeader className="space-y-2">
                                <DialogTitle className="text-lg font-semibold tracking-tight">
                                    Edit org roles
                                </DialogTitle>
                                <DialogDescription id="edit-roles-description">
                                    Roles apply only to this organization membership.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                                <p className="text-sm font-semibold text-foreground">{editingOrgLabel}</p>
                            </div>

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
                                                        )
                                                    }
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
                                <Button onClick={handleAssignRoles}>Save</Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

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
                <div className="flex min-h-0 flex-1 flex-col rounded-md border overflow-hidden">
                    <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-12">
                        <div className="flex max-w-sm flex-col items-center gap-2 text-center text-muted-foreground">
                            <Users className="h-10 w-10 opacity-20" aria-hidden />
                            <p className="text-sm font-medium">No users found</p>
                            <p className="text-sm">Try adjusting your filters or search.</p>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex min-h-0 flex-1 flex-col rounded-md border overflow-hidden">
                        <Table
                            className="w-full table-fixed [&_th]:h-9 [&_th]:py-1.5 [&_th]:px-3 [&_td]:py-1.5 [&_td]:px-3 [&_td]:overflow-hidden [&_tr]:h-[52px]"
                            scrollContainerStyle={{ height: "100%" }}
                        >
                            <TableHeader className="sticky top-0 z-10 bg-muted [&_tr]:border-b">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead
                                                key={header.id}
                                                className={
                                                    header.column.id === "actions" ? "text-right" : undefined
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
                            <TableBody className="[&_tr]:bg-card">
                                {table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        className="border-l-2 border-l-transparent hover:border-l-primary/50 transition-colors"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell
                                                key={cell.id}
                                                className={
                                                    cell.column.id === "actions" ? "text-right" : undefined
                                                }
                                            >
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
