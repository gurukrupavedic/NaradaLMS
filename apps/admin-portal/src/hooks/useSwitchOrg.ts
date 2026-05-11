"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import {
  AUTH_ME_QUERY_KEY,
  isOrgScopedAdminQueryKey,
} from "@/lib/org-switcher";

type SwitchOrgResponse = {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    isSuperAdmin: boolean;
    currentOrgId?: string;
    orgRoles?: string[];
    orgMembershipStatus?: string;
  };
};

type SwitchOrgInput = {
  orgId: string;
};

export function useSwitchOrg() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ orgId }: SwitchOrgInput) =>
      apiRequest<SwitchOrgResponse>("/auth/switch-org", {
        method: "POST",
        body: JSON.stringify({ orgId }),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY }),
        queryClient.invalidateQueries({
          predicate: (query) => isOrgScopedAdminQueryKey(query.queryKey),
        }),
      ]);

      router.refresh();
    },
  });
}
