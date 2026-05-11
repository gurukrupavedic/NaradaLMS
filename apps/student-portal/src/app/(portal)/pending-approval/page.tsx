"use client";

import { useAuth, type AuthSession } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@narada/ui";
import { LoadingSpinner } from "@narada/ui";

export default function PendingApprovalPage() {
    const { user, isLoading, logout } = useAuth();

    if (isLoading || !user) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    const session = user as AuthSession;
    const pending = session.memberships.filter((m) => m.status === "pending");

    return (
        <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Awaiting approval</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                    <p>
                        You are signed in as{" "}
                        <span className="font-medium text-foreground">{session.email}</span>
                        , but you do not have an active organization membership yet.
                    </p>
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
