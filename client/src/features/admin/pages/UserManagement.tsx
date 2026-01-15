import React, { useMemo, useState } from "react";
import { ColumnDef, SortingState, flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { useAdminUsers, useApproveUser, useAssignRoles, useDisableUser, useEnableUser, useRejectUser, AdminUser } from "../hooks/useAdminUsers";
import { useToast } from "@/features/shared-features/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { RefreshCw, MoreVertical, Check, X } from "lucide-react";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useRoleGuard } from '@/features/shared-features/hooks/useRoleGuard';

const ALL_ROLES = ["student", "instructor", "content_manager", "admin"] as const;
const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  instructor: "Instructor",
  content_manager: "Content Manager",
  student: "Student",
};
const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "pending_approval", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function UserManagement() {
  useRoleGuard(['admin']);
  const { toast } = useToast();

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
  const disableUser = useDisableUser();
  const enableUser = useEnableUser();

  const users = data?.users ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? users.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const filteredUsers = users;

  // Compute status counts for all users (not filtered by server)
  const statusCounts = useMemo(() => {
    const allCount = total;
    const pendingCount = users.filter(u => u.status === "pending_approval").length;
    const activeCount = users.filter(u => u.status === "active").length;
    const inactiveCount = users.filter(u => u.status === "inactive").length;
    return { all: allCount, pending: pendingCount, active: activeCount, inactive: inactiveCount };
  }, [users, total]);

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
    approve.mutate(userId, {
      onSuccess: () => {
        toast({ title: "User approved", description: "User is now active." });
        refetch();
      },
      onError: (err: any) => toast({ title: "Failed to approve", description: err.message, variant: "destructive" }),
    });
  };

  const handleReject = (userId: string) => {
    if (!confirm("Are you sure? This will permanently delete the pending user.")) return;
    reject.mutate(userId, {
      onSuccess: () => {
        toast({ title: "User rejected", description: "Pending user has been removed." });
        refetch();
      },
      onError: (err: any) => toast({ title: "Failed to reject", description: err.message, variant: "destructive" }),
    });
  };

  const handleAssignRoles = (userId: string, roles: string[], opts?: { onSuccess?: () => void }) => {
    assignRoles.mutate(
      { userId, roles },
      {
        onSuccess: () => {
          toast({ title: "Roles updated" });
          opts?.onSuccess?.();
          refetch();
        },
        onError: (err: any) => toast({ title: "Failed to update roles", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleToggleStatus = (user: AdminUser) => {
    if (user.status === "inactive") {
      enableUser.mutate(user.id, {
        onSuccess: () => {
          toast({ title: "User enabled" });
          refetch();
        },
        onError: (err: any) => toast({ title: "Failed to enable user", description: err.message, variant: "destructive" }),
      });
    } else {
      disableUser.mutate(user.id, {
        onSuccess: () => {
          toast({ title: "User disabled" });
          refetch();
        },
        onError: (err: any) => toast({ title: "Failed to disable user", description: err.message, variant: "destructive" }),
      });
    }
  };

  const isLoadingState = isLoading || isRefetching;

  const columns: ColumnDef<AdminUser>[] = [
    {
      id: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="text-sm font-medium text-foreground">{formatName(row.original)}</span>
      ),
      enableSorting: false,
    },
    {
      id: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.email}</span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      enableSorting: false,
      size: 120,
    },
    {
      accessorKey: "roles",
      header: "Roles",
      cell: ({ row }) => {
        const user = row.original;
        const isPending = user.status === "pending_approval";
        const isEditing = editingUserId === user.id && !isPending;

        if (isPending) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }

        if (isEditing) {
          return (
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((role) => (
                <label key={role} className="inline-flex items-center gap-2 rounded px-1.5 py-1 text-xs">
                  <input
                    type="checkbox"
                    checked={editingRoles.includes(role)}
                    onChange={() =>
                      setEditingRoles((r) => (r.includes(role) ? r.filter((x) => x !== role) : [...r, role]))
                    }
                  />
                  <span>{ROLE_LABELS[role] ?? role}</span>
                </label>
              ))}
            </div>
          );
        }

        const roles = user.roles ?? [];
        if (roles.length === 0) return <span className="text-sm text-muted-foreground">—</span>;
        const displayRoles = roles.map((r) => ROLE_LABELS[r] ?? r);
        return <span className="text-sm text-foreground">{displayRoles.join(", ")}</span>;
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created / Requested",
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
      size: 140,
    },
    {
      id: "actions",
      header: "Actions",
      size: 100,
      cell: ({ row }) => {
        const user = row.original;
        const isPending = user.status === "pending_approval";
        const isEditing = editingUserId === user.id && !isPending;

        if (isEditing) {
          return (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => handleAssignRoles(user.id, editingRoles, { onSuccess: () => cancelRoleEdit() })} disabled={assignRoles.isPending}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={cancelRoleEdit}>
                Cancel
              </Button>
            </div>
          );
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="data-[state=open]:bg-muted">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open row menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 bg-white dark:bg-black border border-border shadow-lg"
            >
              {isPending ? (
                <>
                  <DropdownMenuItem onClick={() => handleApprove(user.id)} disabled={approve.isPending}>
                    <Check className="mr-2 h-4 w-4" /> Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleReject(user.id)} disabled={reject.isPending}>
                    <X className="mr-2 h-4 w-4" /> Reject
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => startRoleEdit(user)}>
                    Edit roles
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                    {user.status === "inactive" ? "Enable" : "Disable"}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: filteredUsers,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Fixed Header / Tabs Section */}
      <div className="flex-shrink-0 px-4 py-4 bg-background z-10">
        <Tabs value={statusFilter} onValueChange={handleStatusChange} className="w-full">
          <div className="flex items-center justify-between">
            <TabsList className="h-auto bg-transparent p-0">
              <TabsTrigger value="all">
                All Users
              </TabsTrigger>
              <TabsTrigger value="pending_approval">
                Pending <Badge variant="secondary" className="ml-1.5">{statusCounts.pending}</Badge>
              </TabsTrigger>
              <TabsTrigger value="inactive">
                Inactive <Badge variant="secondary" className="ml-1.5">{statusCounts.inactive}</Badge>
              </TabsTrigger>
              <TabsTrigger value="active">
                Active <Badge variant="secondary" className="ml-1.5">{statusCounts.active}</Badge>
              </TabsTrigger>
            </TabsList>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoadingState}
              className="h-8 w-8"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </Tabs>

        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Failed to load users.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
            </div>
          </div>
        )}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 px-4">
        <div className="h-full rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden flex flex-col">
          {isLoadingState ? (
            <div className="p-4">
              <TableSkeleton rows={10} cols={5} />
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
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className="py-2"
                            style={{ width: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="py-12 text-sm text-muted-foreground text-center">No users to display.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Pagination Footer */}
      <div className="flex-shrink-0">
        <DataTablePagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => { setLimit(newSize); setPage(1); }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AdminUser["status"] }) {
  const label = status === "active" ? "Active" : status === "inactive" ? "Inactive" : "Pending";
  return <span className="text-sm text-foreground">{label}</span>;
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

function formatName(u: AdminUser) {
  const fn = u.firstName?.trim();
  const ln = u.lastName?.trim();
  const name = [fn, ln].filter(Boolean).join(" ");
  return name || "—";
}

function formatDate(date?: string | null) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return "—";
  }
}
