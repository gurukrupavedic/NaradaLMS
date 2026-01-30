'use client';

import { useEffect } from 'react';
import { injectOrganizationTheme } from '@narada/ui';
import { getRuntimeConfig } from '@/lib/runtime-config';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Get runtime organization ID
        const config = getRuntimeConfig();

        // Inject organization-specific theme
        injectOrganizationTheme(config.ORGANIZATION_ID);

        console.log(`🎨 Chameleon Theme Applied: ${config.ORGANIZATION_ID}`);
    }, []);

    return <>{children}</>;
}
