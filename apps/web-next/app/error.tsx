'use client'

import Link from 'next/link'

import { ApiError } from '@/lib/api/client'

/**
 * The one error surface for the app.
 *
 * It distinguishes "you asked for something that isn't there" from "something
 * broke", because those need different offers: a 404 wants a way back, a 500
 * wants a retry. Anything else collapses both into an apology with no action.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const isApiError = error instanceof ApiError
  const notFound = isApiError && error.status === 404

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
      <p className="label text-vermilion">{notFound ? 'Not found' : 'Something broke'}</p>

      <h1 className="display mt-4 text-[2.5rem]">
        {notFound ? 'That page isn’t here.' : 'This page didn’t load.'}
      </h1>

      <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
        {notFound
          ? error.message
          : 'The request failed on the way out. Trying again often clears it.'}
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {!notFound && (
          <button type="button" onClick={reset} className="label bg-ink px-4 py-2.5 text-paper">
            Try again
          </button>
        )}
        <Link
          href="/dashboard"
          className="label border border-rule px-4 py-2.5 text-ink-muted transition-colors hover:border-vermilion hover:text-vermilion"
        >
          Back to practice
        </Link>
      </div>

      {error.digest && (
        <p className="label mt-10 text-ink-muted/60">Reference {error.digest}</p>
      )}
    </main>
  )
}
