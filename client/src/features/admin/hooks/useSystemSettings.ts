import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/apiClient";

export type SystemSetting = {
  key: string;
  value: unknown;
  updatedAt?: string;
};

async function fetchSettings(): Promise<{ success: boolean; data: SystemSetting[] }> {
  const res = await apiRequest("/admin/settings");
  if (!res.ok) throw new Error("Failed to load system settings");
  const json = await res.json();
  // Normalize: support either array of {key,value} or object map
  let data: SystemSetting[] = [];
  if (Array.isArray(json?.data)) {
    data = (json.data as any[]).map((s: any) => ({ key: s.key ?? s.name ?? s.id, value: s.value, updatedAt: s.updatedAt }));
  } else if (json?.data && typeof json.data === "object") {
    data = Object.entries(json.data).map(([key, value]) => ({ key, value }));
  } else if (typeof json === "object") {
    data = Object.entries(json as Record<string, unknown>).map(([key, value]) => ({ key, value }));
  }
  return { success: true, data };
}

export function useSystemSettings() {
  return useQuery({ queryKey: ["admin", "settings"], queryFn: fetchSettings });
}

async function putSetting(key: string, value: unknown) {
  const res = await apiRequest(`/admin/settings/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error("Failed to update setting");
  return res.json();
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => putSetting(key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });
}
