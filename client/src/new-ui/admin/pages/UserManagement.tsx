import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import { useAdminUsers, useApproveUser, useAssignRoles, useDisableUser, AdminUser } from "../hooks/useAdminUsers";

const ALL_ROLES = ["student", "instructor", "content_manager", "admin"] as const;

export default function UserManagement() {
  const { data, isLoading, error } = useAdminUsers();
  const approve = useApproveUser();
  const assignRoles = useAssignRoles();
  const disableUser = useDisableUser();

  const users = data?.users ?? [];
  const pending = useMemo(() => users.filter(u => u.status === "pending_approval"), [users]);
  const activeOrInactive = useMemo(() => users.filter(u => u.status !== "pending_approval"), [users]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Admin Center</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">User Management</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Approve new users, manage roles, and disable accounts.</p>
        </div>
        <Link href="/app/admin">
          <a className="text-sm text-primary hover:opacity-80 transition-colors">Back to dashboard</a>
        </Link>
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">Loading users…</div>
      )}

      {error && (
        <div className="rounded-2xl border border-border bg-destructive/10 p-6 text-destructive">Failed to load users. Ensure you have admin access.</div>
      )}

      {!isLoading && !error && (
        <>
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Pending Approvals</h2>
            <div className="rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Requested</th>
                    <th className="px-4 py-3 text-left">Actions</th>
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
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3">{formatName(u)}</td>
                      <td className="px-4 py-3">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button
                          className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:opacity-90"
                          onClick={() => approve.mutate(u.id)}
                          disabled={approve.isPending}
                        >
                          Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">All Users</h2>
            <div className="rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Roles</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrInactive.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-5 text-muted-foreground">No users to display.</td>
                    </tr>
                  )}
                  {activeOrInactive.map(u => (
                    <UserRow key={u.id} user={u} onAssignRoles={(roles) => assignRoles.mutate({ userId: u.id, roles })} onDisable={() => disableUser.mutate(u.id)} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function UserRow({ user, onAssignRoles, onDisable }: { user: AdminUser; onAssignRoles: (roles: string[]) => void; onDisable: () => void }) {
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
            <button className="rounded-md bg-destructive/20 px-3 py-1.5 text-destructive hover:bg-destructive/30" onClick={onDisable}>
              Disable
            </button>
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
