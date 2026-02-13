import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a client for the provider to use internally if one isn't available
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            refetchOnWindowFocus: false,
        },
    },
});

export function TiptapProvider({ children }: { children: React.ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
