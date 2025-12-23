import React, { useState } from "react";
import { Link } from "wouter";
import { useAuditLogs, AuditLogFilters } from "../hooks/useAuditLogs";
import { useToast } from "@/features/shared-features/hooks/use-toast";

export default function AuditLogs() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<AuditLogFilters>({ limit: 25, offset: 0 });
  const { data, isLoading, error } = useAuditLogs(filters);

  const logs = data?.data ?? [];
  const pagination = data?.pagination;
  const limit = filters.limit || 25;
  const offset = filters.offset || 0;
  const total = (pagination as any)?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setFilters({
      userId: (fd.get("userId") as string) || undefined,
      action: (fd.get("action") as string) || undefined,
      resourceType: (fd.get("resourceType") as string) || undefined,
      startDate: (fd.get("startDate") as string) || undefined,
      endDate: (fd.get("endDate") as string) || undefined,
      limit: Number(fd.get("limit") || 25),
      offset: 0,
    });
    toast({ title: "Filters applied" });
  };

  const goToPage = (page: number) => {
    setFilters({ ...filters, offset: (page - 1) * limit });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Admin Center</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">Audit Logs</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Filter and inspect recent system activity.</p>
        </div>
        <Link href="/app/admin">
          <a className="text-sm text-primary hover:opacity-80 transition-colors">Back to dashboard</a>
        </Link>
      </div>

      <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Input name="userId" label="User ID" placeholder="uuid" />
          <Input name="action" label="Action" placeholder="CREATE_CHAPTER" />
          <Input name="resourceType" label="Resource Type" placeholder="chapter|batch|enrollment" />
          <Input name="startDate" label="Start Date" type="datetime-local" />
          <Input name="endDate" label="End Date" type="datetime-local" />
          <Input name="limit" label="Per Page" type="number" defaultValue={25} />
        </div>
        <div className="mt-3">
          <button className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:opacity-90">Apply Filters</button>
        </div>
      </form>

      {isLoading && (
        <div className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">Loading logs…</div>
      )}

      {error && (
        <div className="rounded-2xl border border-border bg-destructive/10 p-6 text-destructive">Failed to load audit logs. Ensure admin access.</div>
      )}

      {!isLoading && !error && (
        <>
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} ({total} total)
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide">Time</th>
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide">User</th>
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide">Action</th>
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide">Resource</th>
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide">ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-5 text-muted-foreground">No logs for selected filters.</td>
                  </tr>
                )}
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-border">
                    <td className="px-3 py-2">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-3 py-2">{log.userId}</td>
                    <td className="px-3 py-2">{log.action}</td>
                    <td className="px-3 py-2">{log.resourceType}</td>
                    <td className="px-3 py-2">{log.resourceId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
              <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50">
                ← Previous
              </button>
              <div className="flex gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, currentPage - 2) + i;
                  if (p > totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => goToPage(p)}
                      className={`rounded-md px-3 py-1.5 text-sm ${p === currentPage ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'}`}
                    >
                      {p}
                    </button>
                  );
                }).filter(Boolean)}
              </div>
              <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50">
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Input({ name, label, placeholder, type = "text", defaultValue }: { name: string; label: string; placeholder?: string; type?: string; defaultValue?: any }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
    </label>
  );
}
