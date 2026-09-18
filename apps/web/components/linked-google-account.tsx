'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { linkGoogleAccount, listAccounts } from '@/lib/auth/client'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" aria-hidden="true" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09zM12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23zM5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84zM12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

/**
 * Whether Google is connected to *this* account, plus the button to connect it — kept separate
 * from `sign-in-form.tsx`'s `signInWithGoogle` on purpose: that one looks an OAuth email up
 * against every account in the database (blocked by design when the match's email isn't verified,
 * since a self-asserted registration email shouldn't let a stranger's Google sign-in take it over).
 * This one instead ties Google to the session already open here, so it only ever needs proving
 * *this* account is really yours — which phone OTP just did.
 */
export function LinkedGoogleAccount() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isLinked, setIsLinked] = useState<boolean | null>(null)
  const [isPending, setIsPending] = useState(false)
  // better-auth's own `/callback/:id` appends `error`/`error_description` to `errorCallbackURL` on
  // failure (see its `redirectOnError` — every OAuth failure path uses that exact param name, not
  // something this file gets to choose). Read once, then strip it so a refresh doesn't re-show it.
  const [error, setError] = useState<string | null>(searchParams.get('error_description') ?? searchParams.get('error'))

  useEffect(() => {
    if (!searchParams.has('error')) return
    router.replace(pathname)
    // Only ever needs to run once, on the redirect back from Google — re-running on every
    // `searchParams`/`router` identity change would fight the very navigation it just issued.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void (async () => {
      const result = await listAccounts()
      setIsLinked(result.data?.some(account => account.providerId === 'google') ?? false)
    })()
  }, [])

  async function handleConnect() {
    setIsPending(true)
    setError(null)
    const returnURL = `${window.location.origin}${pathname}`
    const { error } = await linkGoogleAccount(returnURL, returnURL)
    if (error) {
      setIsPending(false)
      setError(error)
    }
    // No `setIsPending(false)` on success — the browser is about to navigate to Google.
  }

  if (isLinked === null) return <p className="text-[0.875rem] text-ink-muted">Loading…</p>

  if (isLinked) {
    return (
      <p className="flex items-center gap-2 text-[0.9375rem] text-ink">
        <GoogleIcon />
        Google account connected
      </p>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleConnect}
        disabled={isPending}
        className="label flex items-center justify-center gap-2.5 border border-ink/25 px-5 py-3 text-ink transition-colors hover:bg-ink/[0.025] disabled:pointer-events-none disabled:opacity-50"
      >
        <GoogleIcon />
        {isPending ? 'Redirecting…' : 'Connect Google account'}
      </button>
      {error && <p className="mt-3 text-[0.8125rem] text-vermilion">{error}</p>}
    </div>
  )
}
