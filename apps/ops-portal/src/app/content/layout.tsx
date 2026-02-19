"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import OpsLayout from "@/components/layout/OpsLayout";
import { ContentContextLabelContext } from "@/lib/content/context/ContentContextLabelContext";

export default function ContentLayout({ children }: { children: React.ReactNode }) {
    const [contentContextLabel, setContentContextLabel] = useState<string | null>(null);
    const pathname = usePathname();

    useEffect(() => {
        if (!pathname?.match(/\/content\/tracks\/.+\/chapters\/.+/)) {
            setContentContextLabel(null);
        }
    }, [pathname]);

    return (
        <ContentContextLabelContext.Provider value={{ setLabel: setContentContextLabel }}>
            <OpsLayout showContextualNav contentContextLabel={contentContextLabel}>
                {children}
            </OpsLayout>
        </ContentContextLabelContext.Provider>
    );
}
