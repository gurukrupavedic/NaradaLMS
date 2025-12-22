import React, { useState } from "react";
import { Link } from "wouter";
import { useBatches, useCreateBatch, useUpdateBatch, Batch } from "../hooks/useBatches";

export default function BatchManagement() {
  const { data, isLoading, error } = useBatches();
  const createBatch = useCreateBatch();
  const updateBatch = useUpdateBatch();

  const [form, setForm] = useState<Partial<Batch>>({ batchCode: "", batchName: "", status: "active" });

  const submitCreate: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    createBatch.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Admin Center</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">Batch Management</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Create and manage batches. Assign tracks and instructors later.</p>
        </div>
        <Link href="/app/admin">
          <a className="text-sm text-primary hover:opacity-80 transition-colors">Back to dashboard</a>
        </Link>
      </div>

      <form onSubmit={submitCreate} className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold text-foreground">Create Batch</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <LabeledInput label="Batch Code" value={form.batchCode || ""} onChange={(v) => setForm(f => ({ ...f, batchCode: v }))} />
          <LabeledInput label="Batch Name" value={form.batchName || ""} onChange={(v) => setForm(f => ({ ...f, batchName: v }))} />
          <label className="block">
            <span className="text-xs text-muted-foreground">Status</span>
            <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.status || "active"} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="active">active</option>
              <option value="completed">completed</option>
              <option value="archived">archived</option>
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
        <div className="rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-5 text-muted-foreground">No batches yet.</td>
                </tr>
              )}
              {(data ?? []).map(b => (
                <BatchRow key={b.id} batch={b} onUpdate={(payload) => updateBatch.mutate({ id: b.id, payload })} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BatchRow({ batch, onUpdate }: { batch: Batch; onUpdate: (payload: Partial<Batch>) => void }) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Partial<Batch>>({ batchName: batch.batchName, status: batch.status });

  return (
    <tr className="border-t border-border">
      <td className="px-4 py-3">{batch.batchCode}</td>
      <td className="px-4 py-3">
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
      <td className="px-4 py-3">
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
      <td className="px-4 py-3">
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
