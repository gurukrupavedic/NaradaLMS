'use client';

import { Construction } from "lucide-react";

const BODY_BY_VARIANT = {
    dashboard:
        "This page is a lightweight hub for now. Tiles link to working admin areas; richer widgets and the activity section are placeholders for upcoming dashboards.",
    settings:
        "This page is a lightweight hub for now. System settings, configuration options, and integrations are planned for future phases and will show up here as we ship them.",
} as const;

export type AdminWipBannerVariant = keyof typeof BODY_BY_VARIANT;

export interface AdminWipBannerProps {
    readonly variant?: AdminWipBannerVariant;
}

export function AdminWipBanner({ variant = "dashboard" }: AdminWipBannerProps) {
    return (
        <div
            role="status"
            className="flex gap-3 rounded-lg border border-dashed border-amber-500/35 bg-amber-500/[0.06] px-4 py-3 text-sm dark:bg-amber-500/10"
        >
            <Construction
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500"
                aria-hidden
            />
            <div className="min-w-0 space-y-1">
                <p className="font-medium text-foreground">Work in progress</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                    {BODY_BY_VARIANT[variant]}
                </p>
            </div>
        </div>
    );
}
