"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import AdminLayoutShell from "@/components/layout/AdminLayout";
import { ContentContextLabelContext } from "@/lib/content/context/ContentContextLabelContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [contentContextLabel, setContentContextLabel] = useState<string | null>(null);
    const pathname = usePathname();
    const isChapterPage = pathname?.match(/\/admin\/tracks\/.+\/chapters\/.+/);

    useEffect(() => {
        if (!isChapterPage) {
            setContentContextLabel(null);
        }
    }, [pathname, isChapterPage]);

    return (
        <ContentContextLabelContext.Provider value={{ setLabel: setContentContextLabel }}>
            <AdminLayoutShell
                showContextualNav={!!isChapterPage}
                contentContextLabel={contentContextLabel}
            >
                {children}
            </AdminLayoutShell>
        </ContentContextLabelContext.Provider>
    );
}
