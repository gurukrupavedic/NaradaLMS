import { isServer, QueryClient } from '@tanstack/react-query'

/**
 * QueryClient construction for the App Router.
 *
 * NOTE ON SSR PREFETCH — deliberately absent.
 *
 * The textbook App Router setup prefetches on the server and ships a dehydrated
 * cache via `<HydrationBoundary>`. That was built here, worked, and had to be
 * removed: on Next 16.2.6 a Suspense boundary that *actually streams* — a
 * dynamic route whose content resolves after the shell has flushed — never
 * hydrates on the client. The HTML arrives and is inserted; the React tree
 * inside stays inert forever. No error, no warning, no hydration mismatch. The
 * page looks finished and nothing is clickable.
 *
 * That was isolated with a bare probe route — `<Suspense>` around an async
 * server component rendering a client counter, no TanStack Query involved. The
 * counter outside the boundary increments; the one inside never does. It
 * reproduces in dev and in `next build && next start`, and disappears when the
 * route is static or the awaited work finishes before the shell flushes. Since
 * Next wraps every route segment in an implicit boundary, any slow server-side
 * await on a dynamic route hits it — which made the whole app a coin flip,
 * hydrating only when the fetch happened to win the race against the flush.
 *
 * So data is fetched on the client instead: `useQuery` plus a skeleton, no
 * server round trip in the render path. Everything else here — the key factory,
 * shared `queryOptions`, per-query staleTime, optimistic mutations, hover
 * prefetch — is unaffected, and restoring SSR prefetch once the bug is fixed is
 * additive rather than a rewrite.
 *
 * Two rules do most of the work here, and both are easy to get wrong:
 *
 * 1. `staleTime` must be greater than zero. With the library default of 0,
 *    every query that was prefetched on the server is stale the instant it
 *    hydrates, so the browser refetches all of it immediately — the SSR payload
 *    is paid for and then thrown away. 60s is a sane floor; individual queries
 *    raise it where the data barely moves (see `lib/query/options.ts`).
 *
 * 2. The server must get a *fresh* client per request and the browser must keep
 *    exactly one. A module-level singleton shared on the server would leak one
 *    user's cache into another's response; a client recreated on every render
 *    would throw the cache away on every state change.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        // Keep evicted data around long enough that a back-navigation is
        // instant rather than a fresh round trip.
        gcTime: 5 * 60_000,
        // The window regaining focus is not evidence that a syllabus changed.
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Retrying a 4xx just repeats a request the server already rejected.
          const status = (error as { status?: number })?.status
          if (typeof status === 'number' && status >= 400 && status < 500) return false
          return failureCount < 2
        },
      },
      // NOTE: only settled queries are dehydrated — the library default.
      //
      // Overriding `shouldDehydrateQuery` to also ship *pending* queries looks
      // like free streaming and is a trap without the experimental
      // `ReactQueryStreamedHydration` provider: plain `HydrationBoundary` has no
      // channel to deliver the eventual result, so the client hydrates a promise
      // that never settles. `useSuspenseQuery` then suspends forever, the
      // subtree silently keeps its server HTML and never becomes interactive,
      // and nothing errors. Prefetches are awaited instead (see
      // `lib/query/hydrate.tsx`), which is what makes them settled by the time
      // `dehydrate` runs.
    },
  })
}

let browserQueryClient: QueryClient | undefined

export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient()

  // React may suspend during the initial render before the provider commits;
  // reusing the existing instance stops that pass from discarding the cache.
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}
