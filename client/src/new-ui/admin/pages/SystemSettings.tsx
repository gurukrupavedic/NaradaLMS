import React, { useMemo, useState } from "react";
import { useSystemSettings, useUpdateSetting, SystemSetting } from "../hooks/useSystemSettings";
import { Link } from "wouter";
import { useToast } from "@/features/shared-features/hooks/use-toast";

function normalize(settings: SystemSetting[]): { key: string; value: string }[] {
  return settings.map(s => ({ key: s.key, value: typeof s.value === "string" ? s.value : JSON.stringify(s.value ?? "") }));
}

export default function SystemSettings() {
  const { toast } = useToast();
  const { data, isLoading, isError } = useSystemSettings();
  const mutation = useUpdateSetting();

  const rows = useMemo(() => normalize(data?.data ?? []), [data]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const onChange = (key: string, value: string) => setDrafts(prev => ({ ...prev, [key]: value }));
  const onSave = (key: string) => {
    const raw = drafts[key] ?? rows.find(r => r.key === key)?.value ?? "";
    let parsed: unknown = raw;
    try {
      // Allow JSON for complex values; fall back to string
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
    mutation.mutate({ key, value: parsed }, {
      onSuccess: () => {
        toast({ title: "Setting saved" });
        setDrafts(d => { const copy = { ...d }; delete copy[key]; return copy; });
      },
      onError: (err: any) => {
        toast({ title: "Failed to save setting", description: err.message, variant: "destructive" });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">System Settings</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Edit global configuration values. Use plain text or JSON for structured entries.
          </p>
        </div>
        <Link href="/app/admin">
          <a className="text-sm text-primary hover:opacity-80 transition-colors">Back to Admin</a>
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {isLoading && (
          <div className="p-6 text-sm text-muted-foreground">Loading settings…</div>
        )}
        {isError && (
          <div className="p-6 text-sm text-destructive">Failed to load settings.</div>
        )}
        {!isLoading && !isError && rows.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">No settings found.</div>
        )}
        {!isLoading && !isError && rows.length > 0 && (
          <div className="divide-y divide-border">
            {rows.map(({ key, value }) => (
              <div key={key} className="grid gap-4 p-4 md:grid-cols-[240px_1fr_auto] md:items-center">
                <div>
                  <div className="text-sm font-semibold text-foreground">{key}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Key</div>
                </div>
                <div>
                  <label htmlFor={`setting-${key}`} className="sr-only">Value</label>
                  <textarea
                    id={`setting-${key}`}
                    className="w-full min-h-[80px] rounded-xl border border-border bg-background p-3 text-sm"
                    placeholder="Enter value (text or JSON)"
                    value={drafts[key] ?? value}
                    onChange={e => onChange(key, e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-full bg-primary px-4 py-2 text-primary-foreground text-sm hover:opacity-90 transition-colors"
                    onClick={() => onSave(key)}
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
