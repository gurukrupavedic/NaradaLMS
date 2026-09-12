import Link from 'next/link'

import { ApiError } from '@/lib/api/client'

/**
 * What every top-level screen's `useQuery` falls back to on a failed fetch — a bad id in the URL,
 * an expired session that slipped past `client.ts`'s own 401 handling, a network blip that outlasts
 * React Query's retries. Every one of these screens used to check only `data` and fall through to
 * its loading skeleton forever once the query gave up and set `data: undefined` for good — an error
 * looked identical to "still loading," so the page just hung with no way to tell what happened.
 */
export function ScreenError({
  error,
  backHref,
  backLabel = '← Back',
}: {
  error: unknown
  backHref?: string
  backLabel?: string
}) {
  const isNotFound = error instanceof ApiError && error.status === 404
  const message = error instanceof ApiError ? error.message : 'Something went wrong loading this page.'

  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-5xl flex-col items-center justify-center px-5 py-20 text-center">
      <p className="label text-vermilion">{isNotFound ? 'Not found' : 'Something went wrong'}</p>
      <p className="mt-4 max-w-sm text-[0.9375rem] leading-relaxed text-ink-muted">{message}</p>
      {backHref && (
        <Link
          href={backHref}
          className="label mt-6 text-ink underline decoration-vermilion/40 decoration-1 underline-offset-4 transition-colors hover:decoration-vermilion"
        >
          {backLabel}
        </Link>
      )}
    </main>
  )
}
