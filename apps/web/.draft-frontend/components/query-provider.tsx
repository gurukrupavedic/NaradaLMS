'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { getQueryClient } from '@/lib/query/client'

/**
 * `getQueryClient()` rather than `useState(() => new QueryClient())`: the same
 * browser instance has to be reachable from outside React too — the hover
 * prefetch in `use-prefetch.ts` primes the cache before any component that
 * needs it has mounted.
 *
 * Devtools are imported unconditionally and tree-shaken from the production
 * bundle by the library's own build; no dynamic import needed.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  )
}
