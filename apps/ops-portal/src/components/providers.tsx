'use client';

import {
    QueryClient,
    QueryClientProvider,
} from '@tanstack/react-query';
import { ReactNode } from 'react';
import { Toaster } from "@narada/ui";

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <Toaster />
        </QueryClientProvider>
    );
}
