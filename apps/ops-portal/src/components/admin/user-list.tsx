'use client';

import React, { useMemo, useState } from "react";
import { ColumnDef, SortingState, flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { useAdminUsers, useApproveUser, useRejectUser, useAssignRoles, useUserStatusMutation, AdminUser } from "@/lib/hooks/useAdminUsers";
import { Button } from "@narada/ui";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@narada/ui";
import { Badge } from "@narada/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@narada/ui";
import { Tabs, TabsList, TabsTrigger } from "@narada/ui";
import { DataTablePagination } from "@narada/ui";
import { RefreshCw, MoreVertical, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@narada/ui";

const ROLE_LABELS: Record<string, string> = {
    admin: "Admin",
    instructor: "Instructor",
    content_manager: "Content Manager",
    student: "Student",
};

const ALL_ROLES = ["student", "instructor", "content_manager", "admin"] as const;

export default function UserList() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [sorting, setSorting] = useState<SortingState>([]);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editingRoles, setEditingRoles] = useState<string[]>([]);

    const offset = (page - 1) * limit;

    const { data, isLoading, error, refetch, isRefetching } = useAdminUsers({
        limit,
        offset,
        status: statusFilter === "all" ? undefined : statusFilter,
    });

    const approve = useApproveUser();
    const reject = useRejectUser();
    const assignRoles = useAssignRoles();
    const statusMutation = useUserStatusMutation();

    const users = data?.users ?? [];
    const pagination = data?.pagination;
    const total = pagination?.total ?? users.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    // Note: Status counts ideally should come from API, for now we mock or calculate from current page (imperfect)
    // or use separate API call. For MVP port, we'll display counts if available or just list.

    const startRoleEdit = (user: AdminUser) => {
        if (user.status === "pending_approval") return;
        setEditingUserId(user.id);
        setEditingRoles(user.roles ?? []);
    };

    const cancelRoleEdit = () => {
        setEditingUserId(null);
        setEditingRoles([]);
    };

    // Handlers
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
        statusMutation.mutate({
            userId: user.id,
            action: user.status === 'inactive' ? 'enable' : 'disable'
        }, { onSuccess: () => refetch() });
    };


    const columns: ColumnDef<AdminUser>[] = [
        {
            id: "name",
            header: "Name",
            cell: ({ row }) => <span className="text-sm font-medium">{formatName(row.original)}</span>,
        },
        {
            accessorKey: "email",
            header: "Email",
            cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.email}</span>,
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'}>{row.original.status}</Badge>,
        },
        {
            accessorKey: "roles",
            header: "Roles",
            cell: ({ row }) => {
                const user = row.original;
                const isEditing = editingUserId === user.id;

                if (isEditing) {
                    return (
                        <div className="flex flex-wrap gap-2">
                            {ALL_ROLES.map((role) => (
                                <label key={role} className="inline-flex items-center gap-1 text-xs">
                                    <input
                                        type="checkbox"
                                        checked={editingRoles.includes(role)}
                                        onChange={() =>
                                            setEditingRoles((r) => (r.includes(role) ? r.filter((x) => x !== role) : [...r, role]))
                                        }
                                    />
                                    {ROLE_LABELS[role]}
                                </label>
                            ))}
                        </div>
                    );
                }
                return <span className="text-sm">{user.roles?.map(r => ROLE_LABELS[r] || r).join(', ') || '-'}</span>;
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const user = row.original;
                const isEditing = editingUserId === user.id;

                if (isEditing) {
                    return (
                        <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleAssignRoles(user.id)}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={cancelRoleEdit}>Cancel</Button>
                        </div>
                    );
                }

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {user.status === 'pending_approval' ? (
                                <>
                                    <DropdownMenuItem onClick={() => handleApprove(user.id)}><Check className="mr-2 h-4 w-4" /> Approve</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleReject(user.id)}><X className="mr-2 h-4 w-4" /> Reject</DropdownMenuItem>
                                </>
                            ) : (
                                <>
                                    <DropdownMenuItem onClick={() => startRoleEdit(user)}>Edit Roles</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleToggleStatus(user)}>{user.status === 'inactive' ? 'Enable' : 'Disable'}</DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            }
        }
    ];

    const table = useReactTable({
        data: users,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                    <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="pending_approval">Pending</TabsTrigger>
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="inactive">Inactive</TabsTrigger>
                    </TabsList>
                </Tabs>
                <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading || isRefetching}>
                    <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                </Button>
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
                        ) : users.length === 0 ? (
                            <TableRow><TableCell colSpan={columns.length} className="text-center h-24">No users found.</TableCell></TableRow>
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
        </div>
    );
}

function formatName(u: AdminUser) {
    return [u.firstName, u.lastName].filter(Boolean).join(' ') || 'User';
}
