'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { GoogleIcon } from '@/components/google-icon'
import { linkGoogleAccount, listAccounts } from '@/lib/auth/client'

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
