"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
  useSidebar,
  cn,
} from "@narada/ui";
import type { MembershipSummary } from "@/hooks/useAuth";
import {
  getAdminSwitcherMemberships,
  getCurrentAdminMembership,
} from "@/lib/org-switcher";
import { useSwitchOrg } from "@/hooks/useSwitchOrg";

type AdminOrgSwitcherProps = {
  memberships: MembershipSummary[];
  currentOrgId?: string;
  isSuperAdmin: boolean;
};

export function AdminOrgSwitcher({
  memberships,
  currentOrgId,
  isSuperAdmin,
}: AdminOrgSwitcherProps) {
  const { toast } = useToast();
  const switchOrg = useSwitchOrg();
  const { state: sidebarState } = useSidebar();
  const isSidebarCollapsed = sidebarState === "collapsed";

  const switchableMemberships = useMemo(
    () => getAdminSwitcherMemberships(memberships, isSuperAdmin),
    [memberships, isSuperAdmin]
  );
  const currentMembership = useMemo(
    () => getCurrentAdminMembership(switchableMemberships, currentOrgId),
    [switchableMemberships, currentOrgId]
  );

  if (!currentMembership || switchableMemberships.length < 2) {
    return null;
  }

  const handleValueChange = async (nextOrgId: string) => {
    if (nextOrgId === currentMembership.orgId) {
      return;
    }

    const nextMembership = switchableMemberships.find(
      (membership) => membership.orgId === nextOrgId
    );

    try {
      await switchOrg.mutateAsync({ orgId: nextOrgId });
      toast({
        title: "Organization switched",
        description: nextMembership
          ? `Now viewing ${nextMembership.orgSlug.toUpperCase()}.`
          : "Your admin context was updated.",
      });
    } catch (error) {
      toast({
        title: "Unable to switch organization",
        description:
          error instanceof Error
            ? error.message
            : "The organization switch failed. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Select
        value={currentMembership.orgId}
        onValueChange={handleValueChange}
        disabled={switchOrg.isPending}
      >
        <SelectTrigger
          className={cn(
            "h-9 shrink-0 border-input bg-card px-2.5 text-card-foreground [&>span]:line-clamp-1",
            isSidebarCollapsed ? "w-20" : "w-[104px]"
          )}
          aria-label="Switch organization"
        >
          <SelectValue placeholder="Select organization" />
        </SelectTrigger>
        <SelectContent>
          {switchableMemberships.map((membership) => (
            <SelectItem key={membership.membershipId} value={membership.orgId}>
              {membership.orgSlug.toUpperCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
  );
}
