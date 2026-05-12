"use client";

import { useAuth, type AuthSession } from "@/hooks/useAuth";
import {
    buildTenantMembershipRequest,
    getStudentShellBranding,
} from "@/lib/tenant";
import { apiRequest } from "@/lib/api";
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    useToast,
} from "@narada/ui";
import { LoadingSpinner } from "@narada/ui";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useState } from "react";

export default function PendingApprovalPage() {
    const { user, isLoading, logout } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [isRequestingMembership, setIsRequestingMembership] = useState(false);

    if (isLoading || !user) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    const session = user as AuthSession;
    const pending = session.memberships.filter((m) => m.status === "pending");
    const tenantBranding = getStudentShellBranding();
    const currentTenantMembership = session.currentTenantMembership;

    const handleRequestMembership = async () => {
        const membershipRequest = buildTenantMembershipRequest();
        setIsRequestingMembership(true);
        try {
            const response = await apiRequest<{
                message?: string;
                result?: string;
            }>("/auth/request-membership", {
                method: "POST",
                headers: membershipRequest.headers,
                body: JSON.stringify(membershipRequest.body),
            });
            await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
            toast({
                title: "Request submitted",
                description:
                    response.message ??
                    "Your membership request is pending approval.",
            });
        } catch (error) {
            toast({
                title: "Request failed",
                description:
                    error instanceof Error ? error.message : "Unable to request access",
                variant: "destructive",
            });
        } finally {
            setIsRequestingMembership(false);
        }
    };

    const renderTenantAccessMessage = () => {
        if (session.currentTenantAccessState === "needs_membership") {
            return (
                <>
                    <p>
                        You are signed in as{" "}
                        <span className="font-medium text-foreground">{session.email}</span>
                        , but you have not requested access to{" "}
                        <span className="font-medium text-foreground">
                            {tenantBranding.displayName}
                        </span>{" "}
                        yet.
                    </p>
                    <Button
                        type="button"
                        onClick={() => void handleRequestMembership()}
                        disabled={isRequestingMembership}
                    >
                        {isRequestingMembership
                            ? "Requesting access..."
                            : `Request access to ${tenantBranding.displayName}`}
                    </Button>
                </>
            );
        }

        if (session.currentTenantAccessState === "inactive") {
            return (
                <p>
                    Your membership for{" "}
                    <span className="font-medium text-foreground">
                        {currentTenantMembership?.orgName ?? tenantBranding.displayName}
                    </span>{" "}
                    is inactive. Contact a super-admin to restore access.
                </p>
            );
        }

        if (session.currentTenantAccessState === "rejected") {
            return (
                <p>
                    Your membership request for{" "}
                    <span className="font-medium text-foreground">
                        {currentTenantMembership?.orgName ?? tenantBranding.displayName}
                    </span>{" "}
                    was rejected. Contact a super-admin if you need to reapply.
                </p>
            );
        }

        return (
            <>
                <p>
                    You are signed in as{" "}
                    <span className="font-medium text-foreground">{session.email}</span>
                    , but your membership for{" "}
                    <span className="font-medium text-foreground">
                        {currentTenantMembership?.orgName ?? tenantBranding.displayName}
                    </span>{" "}
                    is still pending approval.
                </p>
                <p className="text-sm">
                    You can keep using any already-approved organizations from their own
                    portals while this request is reviewed.
                </p>
            </>
        );
    };

    return (
        <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col items-center gap-4 text-center">
                        <Image
                            src={tenantBranding.logoPath}
                            alt={tenantBranding.logoAlt}
                            width={96}
                            height={96}
                            className="h-20 w-auto"
                        />
                        <p className="text-sm text-muted-foreground">
                            {tenantBranding.displayName}
                        </p>
                    </div>
                    <CardTitle>Awaiting approval</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                    {renderTenantAccessMessage()}
                    {pending.length > 0 ? (
                        <ul className="list-inside list-disc space-y-1 text-sm">
                            {pending.map((m) => (
                                <li key={m.membershipId}>
                                    <span className="font-medium text-foreground">
                                        {m.orgName}
                                    </span>{" "}
                                    ({m.orgSlug}) — pending
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm">
                            No membership requests are on file. If you believe this is an
                            error, contact your pathasala administrator.
                        </p>
                    )}
                    <button
                        type="button"
                        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                        onClick={() => void logout()}
                    >
                        Sign out
                    </button>
                </CardContent>
            </Card>
        </div>
    );
}
