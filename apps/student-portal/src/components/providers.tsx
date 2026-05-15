'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Toaster, ThemeProvider } from "@narada/ui";
import { getCurrentTenantSlug } from '@/lib/tenant';

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30 * 1000,
                retry: 1,
                refetchOnWindowFocus: false,
            },
        },
    }));

    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return;
        const port = typeof window !== 'undefined' ? window.location.port : '';
        const slug = getCurrentTenantSlug();
        if (port === '3001' && slug !== 'rr') {
            console.warn(
                '[student-portal] Port 3001 expects TENANT=rr (npm run dev:rr). ' +
                    `Current NEXT_PUBLIC_TENANT is "${slug}"; X-Tenant-Slug will not target RR.`
            );
        }
        if (port === '3000' && slug !== 'slmts') {
            console.warn(
                '[student-portal] Port 3000 expects TENANT=slmts (npm run dev / dev:slmts). ' +
                    `Current NEXT_PUBLIC_TENANT is "${slug}".`
            );
        }
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                {children}
                <Toaster />
            </ThemeProvider>
        </QueryClientProvider>
    );
}
