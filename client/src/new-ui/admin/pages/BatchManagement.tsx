import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useBatches, useCreateBatch, useUpdateBatch, Batch } from "../hooks/useBatches";
import { useToast } from "@/features/shared-features/hooks/use-toast";

type Track = { id: number; title?: string; name?: string };

export default function BatchManagement() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const limit = 25;
  const offset = (page - 1) * limit;

  const { data, isLoading, error } = useBatches({ limit, offset });
  const createBatch = useCreateBatch();
  const updateBatch = useUpdateBatch();

  const [form, setForm] = useState<Partial<Batch>>({ batchCode: "", batchName: "", trackId: undefined });

  // Fetch tracks to allow associating a batch with a current track
  const { data: tracks = [] } = useQuery<Track[]>({
    queryKey: ["/api/learning/tracks"],
  });

  const submitCreate: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    createBatch.mutate({ batchCode: form.batchCode, batchName: form.batchName, trackId: form.trackId ?? undefined }, {
      onSuccess: () => {
        toast({ title: "Batch created" });
        setForm({ batchCode: "", batchName: "", trackId: undefined });
      },
      onError: (err: any) => {
        toast({ title: "Failed to create batch", description: err.message, variant: "destructive" });
      },
    });
  };

  const batches = data?.items ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination ? Math.ceil(pagination.total / limit) : 1;

  return (
    <div className="space-y-6">
      <form onSubmit={submitCreate} className="rounded-2xl border border-border bg-card p-3">
        <h2 className="text-base font-semibold text-foreground">Create Batch</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <LabeledInput label="Batch Code" value={form.batchCode || ""} onChange={(v) => setForm(f => ({ ...f, batchCode: v }))} />
          <LabeledInput label="Batch Name" value={form.batchName || ""} onChange={(v) => setForm(f => ({ ...f, batchName: v }))} />
          <label className="block">
            <span className="text-xs text-muted-foreground">Current Track (optional)</span>
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={form.trackId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setForm(f => ({ ...f, trackId: v ? parseInt(v) : undefined }));
              }}
            >
              <option value="">— Select track —</option>
              {tracks.map(t => {
                const label = t.title || t.name || `Track ${t.id}`;
                return <option key={t.id} value={t.id}>{label}</option>;
              })}
            </select>
          </label>
        </div>
        <div className="mt-3">
          <button className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:opacity-90" disabled={createBatch.isPending}>Create</button>
        </div>
      </form>

      {isLoading && (
        <div className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">Loading batches…</div>
      )}
      {error && (
        <div className="rounded-2xl border border-border bg-destructive/10 p-6 text-destructive">Failed to load batches.</div>
      )}

      {!isLoading && !error && (
        <>
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({pagination?.total ?? 0} total)
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide">Code</th>
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide">Name</th>
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide">Track</th>
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide">Status</th>
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-5 text-muted-foreground">No batches yet.</td>
                  </tr>
                )}
                {batches.map(b => (
                  <BatchRow key={b.id} batch={b} tracks={tracks} onUpdate={(payload) => {
                    updateBatch.mutate({ id: b.id, payload }, {
                      onSuccess: () => toast({ title: "Batch updated" }),
                      onError: (err: any) => toast({ title: "Failed to update", description: err.message, variant: "destructive" }),
                    });
                  }} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50">
                ← Previous
              </button>
              <div className="flex gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, page - 2) + i;
                  if (p > totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`rounded-md px-3 py-1.5 text-sm ${p === page ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'}`}
                    >
                      {p}
                    </button>
                  );
                }).filter(Boolean)}
              </div>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50">
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BatchRow({ batch, tracks, onUpdate }: { batch: Batch; tracks: { id: number; title?: string; name?: string }[]; onUpdate: (payload: Partial<Batch>) => void }) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Partial<Batch>>({ batchName: batch.batchName, status: batch.status, trackId: batch.trackId ?? undefined });

  return (
    <tr className="border-t border-border">
      <td className="px-4 py-3">{batch.batchCode}</td>
      <td className="px-3 py-2">
        {editing ? (
          <label className="block">
            <span className="sr-only">Batch Name</span>
            <input
              aria-label="Batch Name"
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
              value={values.batchName || ""}
              onChange={(e) => setValues(v => ({ ...v, batchName: e.target.value }))}
              placeholder="Batch Name"
            />
          </label>
        ) : (
          batch.batchName
        )}
      </td>
      <td className="px-3 py-2">
        {editing ? (
          <label className="block">
            <span className="sr-only">Track</span>
            <select
              aria-label="Track"
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
              value={values.trackId ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setValues(val => ({ ...val, trackId: v ? parseInt(v) : null }));
              }}
              title="Track"
            >
              <option value="">— None —</option>
              {tracks.map(t => {
                const label = t.title || t.name || `Track ${t.id}`;
                return <option key={t.id} value={t.id}>{label}</option>;
              })}
            </select>
          </label>
        ) : (
          (() => {
            const t = tracks.find(t => t.id === (batch.trackId ?? -1));
            return t ? (t.title || t.name || `Track ${t.id}`) : '—';
          })()
        )}
      </td>
      <td className="px-3 py-2">
        {editing ? (
          <label className="block">
            <span className="sr-only">Status</span>
            <select
              aria-label="Status"
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
              value={values.status || "active"}
              onChange={(e) => setValues(v => ({ ...v, status: e.target.value }))}
              title="Status"
            >
              <option value="active">active</option>
              <option value="completed">completed</option>
              <option value="archived">archived</option>
            </select>
          </label>
        ) : (
          batch.status
        )}
      </td>
      <td className="px-3 py-2">
        {editing ? (
          <div className="flex gap-2">
            <button className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:opacity-90" onClick={() => { onUpdate(values); setEditing(false); }}>Save</button>
            <button className="rounded-md border border-border px-3 py-1.5 text-foreground hover:bg-muted" onClick={() => { setValues({ batchName: batch.batchName, status: batch.status }); setEditing(false); }}>Cancel</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button className="rounded-md border border-border px-3 py-1.5 text-foreground hover:bg-muted" onClick={() => setEditing(true)}>Edit</button>
            <a href={`/app/admin/batches/${batch.id}`} className="rounded-md bg-accent/20 px-3 py-1.5 text-accent-foreground hover:bg-accent/30">Manage</a>
          </div>
        )}
      </td>
    </tr>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
