import React, { useMemo, useState } from "react";
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
import { Badge } from "@/components/design-system/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Shield, UserMinus, UserPlus } from "lucide-react";

const ALL_ROLES = ["student", "instructor", "content_manager", "admin"] as const;
const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "pending_approval", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function UserManagement() {
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const limit = 25;
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

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((u) => {
      if (query) {
        const name = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
        const email = u.email.toLowerCase();
        if (!name.includes(query) && !email.includes(query)) return false;
      }
      if (roleFilter !== "all" && !(u.roles || []).includes(roleFilter)) return false;
      return true;
    });
  }, [users, search, roleFilter]);

  const pending = useMemo(
    () => filteredUsers.filter((u) => u.status === "pending_approval"),
    [filteredUsers]
  );

  const activeOrInactive = useMemo(
    () => filteredUsers.filter((u) => u.status !== "pending_approval"),
    [filteredUsers]
  );

  const handleApprove = (userId: string) => {
    approve.mutate(userId, {
      onSuccess: () => toast({ title: "User approved", description: "User is now active." }),
      onError: (err: any) => toast({ title: "Failed to approve", description: err.message, variant: "destructive" }),
    });
  };

  const handleReject = (userId: string) => {
    if (!confirm("Are you sure? This will permanently delete the pending user.")) return;
    reject.mutate(userId, {
      onSuccess: () => toast({ title: "User rejected", description: "Pending user has been removed." }),
      onError: (err: any) => toast({ title: "Failed to reject", description: err.message, variant: "destructive" }),
    });
  };

  const handleAssignRoles = (userId: string, roles: string[]) => {
    assignRoles.mutate(
      { userId, roles },
      {
        onSuccess: () => toast({ title: "Roles updated" }),
        onError: (err: any) => toast({ title: "Failed to update roles", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleToggleStatus = (user: AdminUser) => {
    if (user.status === "inactive") {
      enableUser.mutate(user.id, {
        onSuccess: () => toast({ title: "User enabled" }),
        onError: (err: any) => toast({ title: "Failed to enable user", description: err.message, variant: "destructive" }),
      });
    } else {
      disableUser.mutate(user.id, {
        onSuccess: () => toast({ title: "User disabled" }),
        onError: (err: any) => toast({ title: "Failed to disable user", description: err.message, variant: "destructive" }),
      });
    }
  };

  const resetFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  const isLoadingState = isLoading || isRefetching;

  return (
    <div className="space-y-6 pb-10 px-3 sm:px-4 lg:px-6">
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email"
            className="w-64"
          />
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ALL_ROLES.map((role) => (
                <SelectItem key={role} value={role}>{role}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="secondary" onClick={resetFilters} disabled={isLoadingState}>
            Clear filters
          </Button>
          <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
            <span>Showing {filteredUsers.length} of {total} users</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoadingState}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Failed to load users.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-semibold text-foreground">Pending Approvals</h2>
          <p className="text-sm text-muted-foreground">{pending.length} pending</p>
        </div>
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          {isLoadingState ? (
            <PendingSkeleton />
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="w-1/4">Email</TableHead>
                  <TableHead className="w-1/4">Name</TableHead>
                  <TableHead className="w-1/4">Requested</TableHead>
                  <TableHead className="w-1/4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-sm text-muted-foreground">No pending approvals.</TableCell>
                  </TableRow>
                )}
                {pending.map((u) => (
                  <TableRow key={u.id} className="border-t border-border">
                    <TableCell className="align-middle text-sm font-medium">{u.email}</TableCell>
                    <TableCell className="align-middle text-sm">{formatName(u)}</TableCell>
                    <TableCell className="align-middle text-sm text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                    <TableCell className="align-middle">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => handleApprove(u.id)} disabled={approve.isPending}>
                          <UserPlus className="mr-2 h-4 w-4" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(u.id)}
                          disabled={reject.isPending}
                        >
                          <UserMinus className="mr-2 h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-semibold text-foreground">All Users</h2>
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          {isLoadingState ? (
            <TableSkeleton rows={5} cols={5} />
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="w-1/4">User</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-1/3">Roles</TableHead>
                  <TableHead className="w-32">Created</TableHead>
                  <TableHead className="w-44">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeOrInactive.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-sm text-muted-foreground">No users to display.</TableCell>
                  </TableRow>
                )}
                {activeOrInactive.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    onAssignRoles={(roles) => handleAssignRoles(user.id, roles)}
                    onDisableOrEnable={() => handleToggleStatus(user)}
                    isMutating={assignRoles.isPending || disableUser.isPending || enableUser.isPending}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              ← Previous
            </Button>
            <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next →
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function UserRow({ user, onAssignRoles, onDisableOrEnable, isMutating }: { user: AdminUser; onAssignRoles: (roles: string[]) => void; onDisableOrEnable: () => void; isMutating: boolean }) {
  const [editing, setEditing] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles ?? []);

  const toggleRole = (role: string) => {
    setSelectedRoles((r) => (r.includes(role) ? r.filter((x) => x !== role) : [...r, role]));
  };

  return (
    <TableRow className="border-t border-border">
      <TableCell className="align-middle">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">{formatName(user)}</span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>
      </TableCell>
      <TableCell className="align-middle">
        <StatusBadge status={user.status} />
      </TableCell>
      <TableCell className="align-middle">
        {editing ? (
          <div className="flex flex-wrap gap-2">
            {ALL_ROLES.map((role) => (
              <label key={role} className="inline-flex items-center gap-2 rounded-md border border-border bg-muted px-2 py-1 text-xs">
                <input type="checkbox" checked={selectedRoles.includes(role)} onChange={() => toggleRole(role)} />
                <span>{role}</span>
              </label>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {(user.roles ?? []).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
            {(user.roles ?? []).map((role) => (
              <Badge key={role} variant="secondary" size="sm" className="rounded-md text-xs">
                <Shield className="mr-1 h-3 w-3" /> {role}
              </Badge>
            ))}
          </div>
        )}
      </TableCell>
      <TableCell className="align-middle text-sm text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
      <TableCell className="align-middle">
        {editing ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { onAssignRoles(selectedRoles); setEditing(false); }} disabled={isMutating}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setSelectedRoles(user.roles ?? []); setEditing(false); }}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Edit roles
            </Button>
            {user.status === "inactive" ? (
              <Button size="sm" onClick={onDisableOrEnable} disabled={isMutating}>
                Enable
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={onDisableOrEnable} disabled={isMutating}>
                Disable
              </Button>
            )}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

function StatusBadge({ status }: { status: AdminUser["status"] }) {
  const tone = status === "active" ? "success" : status === "inactive" ? "warning" : "muted";
  const label = status === "active" ? "Active" : status === "inactive" ? "Inactive" : "Pending";
  const toneClass = tone === "success" ? "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-100" : tone === "warning" ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100" : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-50";

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${toneClass}`}>
      {label}
    </span>
  );
}

function PendingSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
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
