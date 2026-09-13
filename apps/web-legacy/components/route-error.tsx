'use client'

import { useEffect } from 'react'

import { Button } from '@/components/ui/button'

export function RouteError({
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm bg-card p-8 text-center ring-1 ring-foreground/10">
        <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Error</p>
        <h1 className="mb-3 font-serif text-2xl font-semibold">Something went wrong</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          This page couldn&apos;t load. Try again, or come back in a moment.
        </p>
        <Button onClick={reset} className="w-full">
          Try again
        </Button>
      </div>
    </div>
  )
}
