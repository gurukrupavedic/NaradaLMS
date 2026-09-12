'use client'

import { useEffect } from 'react'

import './globals.css'

// Every route group's layout.tsx renders its own <html>/<body> (there's no single shared
// root layout above them), so a failure inside one of those layouts — e.g. the session
// check itself, not just a page's data fetching — can only be caught here, not by a
// regular error.tsx. Deliberately dependency-free: this is the one fallback that must
// never itself fail, so it doesn't reach for fonts, providers, or the Button component.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full items-center justify-center bg-background px-4 font-sans text-sm text-foreground">
        <div className="w-full max-w-sm bg-card p-8 text-center ring-1 ring-foreground/10">
          <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Error</p>
          <h1 className="mb-3 text-2xl font-semibold">Something went wrong</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            The app couldn&apos;t load. Try again, or come back in a moment.
          </p>
          <button
            onClick={reset}
            className="w-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
