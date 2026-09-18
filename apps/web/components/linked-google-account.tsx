'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { linkGoogleAccount, listAccounts } from '@/lib/auth/client'

// The standard-color "G" mark from Google's branding guidelines (developers.google.com/identity/
// branding-guidelines) — same asset as login/page.tsx's own GoogleIcon; that page requires this
// exact, unmodified, un-recolored logo wherever it represents a Google account/sign-in action.
function GoogleIcon() {
  return (
    <svg viewBox="0 0 366 372" className="h-[18px] w-auto shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M361.7 151.1c5.8 32.7 4.5 66.8-4.7 98.8-8.5 29.3-24.6 56.5-47.1 77.2l-59.1-45.9c19.5-13.1 33.3-34.3 37.2-57.5H186.6c.1-24.2.1-48.4.1-72.6h175z"
      />
      <path
        fill="#34A853"
        d="M81.4 222.2c7.8 22.9 22.8 43.2 42.6 57.1 12.4 8.7 26.6 14.9 41.4 17.9 14.6 3 29.7 2.6 44.4.1 14.6-2.6 28.7-7.9 41-16.2l59.1 45.9c-21.3 19.7-48 33.1-76.2 39.6-31.2 7.1-64.2 7.3-95.2-1-24.6-6.5-47.7-18.2-67.6-34.1-20.9-16.6-38.3-38-50.4-62 20.3-15.7 40.6-31.5 60.9-47.3z"
      />
      <path
        fill="#FBBC05"
        d="M20.6 102.4c20.3 15.8 40.6 31.5 61 47.3-8 23.3-8 49.2 0 72.4-20.3 15.8-40.6 31.6-60.9 47.3C1.9 232.7-3.8 189.6 4.4 149.2c3.3-16.2 8.7-32 16.2-46.8z"
      />
      <path
        fill="#EA4335"
        d="M125.9 10.2c40.2-13.9 85.3-13.6 125.3 1.1 22.2 8.2 42.5 21 59.9 37.1-5.8 6.3-12.1 12.2-18.1 18.3l-34.2 34.2c-11.3-10.8-25.1-19-40.1-23.6-17.6-5.3-36.6-6.1-54.6-2.2-21 4.5-40.5 15.5-55.6 30.9-12.2 12.3-21.4 27.5-27 43.9-20.3-15.8-40.6-31.5-61-47.3 21.5-43 60.1-76.9 105.4-92.4z"
      />
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
