import React, { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAdminUsers, useApproveUser, useAssignRoles, useDisableUser, useEnableUser, useRejectUser, AdminUser } from "../hooks/useAdminUsers";
import { useToast } from "@/features/shared-features/hooks/use-toast";

const ALL_ROLES = ["student", "instructor", "content_manager", "admin"] as const;

export default function UserManagement() {
  const { toast } = useToast();
  const [_location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const pageParam = searchParams.get('page');
  const statusParam = searchParams.get('status') || undefined;

  const page = Math.max(1, parseInt(pageParam || '1'));
  const limit = 25;
  const offset = (page - 1) * limit;

  const { data, isLoading, error } = useAdminUsers({ limit, offset, status: statusParam });
  const approve = useApproveUser();
  const reject = useRejectUser();
  const assignRoles = useAssignRoles();
  const disableUser = useDisableUser();
  const enableUser = useEnableUser();

  const users = data?.users ?? [];
  const pagination = data?.pagination;
  const pending = useMemo(() => users.filter(u => u.status === "pending_approval"), [users]);
  const activeOrInactive = useMemo(() => users.filter(u => u.status !== "pending_approval"), [users]);

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

  const totalPages = pagination ? Math.ceil(pagination.total / limit) : 1;
  const goToPage = (p: number) => setLocation(`?page=${p}${statusParam ? `&status=${statusParam}` : ''}`);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Pending Approvals</h2>
            <div className="rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide">Email</th>
                    <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide">Name</th>
                    <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide">Requested</th>
                    <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-5 text-muted-foreground">No pending approvals.</td>
                    </tr>
                  )}
                  {pending.map(u => (
                    <tr key={u.id} className="border-t border-border">
                      <td className="px-3 py-2">{u.email}</td>
                      <td className="px-3 py-2">{formatName(u)}</td>
                      <td className="px-3 py-2">{formatDate(u.createdAt)}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
                            onClick={() => handleApprove(u.id)}
                            disabled={approve.isPending}
                          >
                            Approve
                          </button>
                          <button
                            className="rounded-md bg-destructive/20 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/30 disabled:opacity-50"
                            onClick={() => handleReject(u.id)}
                            disabled={reject.isPending}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">All Users</h2>
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({pagination?.total ?? 0} total)
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide">Email</th>
                    <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide">Name</th>
                    <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide">Status</th>
                    <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide">Roles</th>
                    <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrInactive.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-5 text-muted-foreground">No users to display.</td>
                    </tr>
                  )}
                  {activeOrInactive.map(u => (
                    <UserRow key={u.id} user={u} onAssignRoles={(roles) => {
                      assignRoles.mutate({ userId: u.id, roles }, {
                        onSuccess: () => toast({ title: "Roles updated" }),
                        onError: (err: any) => toast({ title: "Failed to update roles", description: err.message, variant: "destructive" }),
                      });
                    }} onDisableOrEnable={() => {
                      if (u.status === "inactive") {
                        enableUser.mutate(u.id, {
                          onSuccess: () => toast({ title: "User enabled" }),
                          onError: (err: any) => toast({ title: "Failed to enable user", description: err.message, variant: "destructive" }),
                        });
                      } else {
                        disableUser.mutate(u.id, {
                          onSuccess: () => toast({ title: "User disabled" }),
                          onError: (err: any) => toast({ title: "Failed to disable user", description: err.message, variant: "destructive" }),
                        });
                      }
                    }} />
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
                <button onClick={() => goToPage(page - 1)} disabled={page === 1} className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50">
                  ← Previous
                </button>
                <div className="flex gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.max(1, page - 2) + i;
                    if (p > totalPages) return null;
                    return (
                      <button
                        key={p}
                        onClick={() => goToPage(p)}
                        className={`rounded-md px-3 py-1.5 text-sm ${p === page ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'}`}
                      >
                        {p}
                      </button>
                    );
                  }).filter(Boolean)}
                </div>
                <button onClick={() => goToPage(page + 1)} disabled={page === totalPages} className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50">
                  Next →
                </button>
              </div>
            )}
          </section>
    </div>
  );
}

function UserRow({ user, onAssignRoles, onDisableOrEnable }: { user: AdminUser; onAssignRoles: (roles: string[]) => void; onDisableOrEnable: () => void }) {
  const [editing, setEditing] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles ?? []);

  const toggleRole = (role: string) => {
    setSelectedRoles(r => r.includes(role) ? r.filter(x => x !== role) : [...r, role]);
  };

  return (
    <tr className="border-t border-border">
      <td className="px-4 py-3">{user.email}</td>
      <td className="px-4 py-3">{formatName(user)}</td>
      <td className="px-4 py-3">{formatStatus(user.status)}</td>
      <td className="px-4 py-3">
        {editing ? (
          <div className="flex flex-wrap gap-2">
            {ALL_ROLES.map(role => (
              <label key={role} className="inline-flex items-center gap-2 rounded-md border border-border bg-muted px-2 py-1">
                <input type="checkbox" checked={selectedRoles.includes(role)} onChange={() => toggleRole(role)} />
                <span className="text-xs">{role}</span>
              </label>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {(user.roles ?? []).length === 0 && <span className="text-muted-foreground">—</span>}
            {(user.roles ?? []).map(role => (
              <span key={role} className="rounded-md bg-accent/20 px-2 py-1 text-xs text-accent-foreground">{role}</span>
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <div className="flex gap-2">
            <button className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:opacity-90" onClick={() => { onAssignRoles(selectedRoles); setEditing(false); }}>
              Save
            </button>
            <button className="rounded-md border border-border px-3 py-1.5 text-foreground hover:bg-muted" onClick={() => { setSelectedRoles(user.roles ?? []); setEditing(false); }}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button className="rounded-md border border-border px-3 py-1.5 text-foreground hover:bg-muted" onClick={() => setEditing(true)}>
              Edit Roles
            </button>
            {user.status === "inactive" ? (
              <button className="rounded-md bg-green-500/20 px-3 py-1.5 text-green-600 hover:bg-green-500/30" onClick={onDisableOrEnable}>
                Enable
              </button>
            ) : (
              <button className="rounded-md bg-destructive/20 px-3 py-1.5 text-destructive hover:bg-destructive/30" onClick={onDisableOrEnable}>
                Disable
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
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

function formatStatus(status: AdminUser["status"]) {
  if (status === "active") return "Active";
  if (status === "inactive") return "Inactive";
  return "Pending Approval";
}
