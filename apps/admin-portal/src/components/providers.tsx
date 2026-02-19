'use client';

import {
    QueryClient,
    QueryClientProvider,
} from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { Toaster } from "@narada/ui";
import { ThemeProvider } from "@narada/ui";

export function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30 * 1000, // 30 seconds
                retry: 1,
                refetchOnWindowFocus: false,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                {children}
                <Toaster />
            </ThemeProvider>
        </QueryClientProvider>
    );
}
