import React from "react";
import { useAdminStats } from "../hooks/useAdminStats";
import { ShieldCheck, Users2, ClipboardList, Layers, BookOpen, Activity } from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { data, isLoading, error } = useAdminStats(10);

  const stats = data?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Admin Center</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">Overview</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            System health, approvals, batches, and recent activity. Live data — no placeholders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/app/admin/settings">
              <a className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted transition-colors whitespace-nowrap">System Settings</a>
          </Link>
          <Link href="/app">
            <a className="text-sm text-primary hover:opacity-80 transition-colors">Back to overview</a>
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">Loading dashboard…</div>
      )}

      {error && (
        <div className="rounded-2xl border border-border bg-destructive/10 p-6 text-destructive">
          Failed to load admin stats. Ensure you're logged in as an admin.
        </div>
      )}

      {stats && (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <StatCardLink href="/app/admin/users" icon={Users2} label="Total Users" value={stats.totalUsers} />
            <StatCardLink href="/app/admin/users?status=pending_approval" icon={ShieldCheck} label="Pending Approvals" value={stats.pendingApprovals} accent="warning" />
            <StatCardLink href="/app/admin/users?status=active" icon={Users2} label="Active Users" value={stats.activeUsers} />
            <StatCardLink href="/app/admin/batches" icon={Layers} label="Batches" value={stats.totalBatches} />
            <StatCardLink href="/app/admin/batches" icon={Layers} label="Active Batches" value={stats.activeBatches} />
            <StatCardLink href="" icon={BookOpen} label="Tracks" value={stats.totalTracks} />
            <StatCardLink href="" icon={ClipboardList} label="Chapters" value={stats.totalChapters} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
              </div>
              <div className="mt-4 divide-y divide-border">
                {stats.recentAudit.length === 0 && (
                  <p className="text-sm text-muted-foreground">No recent activity.</p>
                )}
                {stats.recentAudit.map((log) => (
                  <div key={log.id} className="py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{log.action}</span>
                      <span className="text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {log.resourceType} • {log.resourceId}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-3">
              <h2 className="text-base font-semibold text-foreground">Quick Links</h2>
              <div className="mt-3 grid gap-2">
                <QuickLink href="/app/admin/users" label="User Management" />
                <QuickLink href="/app/admin/batches" label="Batch Management" />
                <QuickLink href="/app/admin/logs" label="Audit Logs" />
                 <QuickLink href="/app/admin/settings" label="System Settings" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCardLink({
  href,
  icon: Icon,
  label,
  value,
  accent,
}: {
  href: string;
  icon: React.ComponentType<any>;
  label: string;
  value: number | string;
  accent?: "warning" | "normal";
}) {
  if (!href) {
    return (
      <div className="rounded-2xl border border-border bg-card p-3 min-h-[92px]">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className={"text-xl font-semibold " + (accent === "warning" ? "text-orange-600 dark:text-orange-400" : "text-foreground")}>{value}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link href={href}>
      <a className="block rounded-2xl border border-border bg-card p-3 min-h-[92px] hover:border-primary/50 hover:bg-accent/5 transition-colors">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className={"text-xl font-semibold " + (accent === "warning" ? "text-orange-600 dark:text-orange-400" : "text-foreground")}>{value}</p>
          </div>
        </div>
      </a>
    </Link>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: number | string;
  accent?: "warning" | "normal";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={"text-2xl font-semibold " + (accent === "warning" ? "text-orange-600 dark:text-orange-400" : "text-foreground")}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href}>
      <a className="inline-flex items-center justify-between rounded-xl border border-border bg-muted px-3 py-1.5 text-sm text-foreground hover:bg-muted/70 transition-colors">
        <span>{label}</span>
        <span>→</span>
      </a>
    </Link>
  );
}
