'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'

import { cn } from '@/lib/utils'
import { Wordmark } from '@/components/app-shell'
import { startDeviceLink, pollDeviceLink, type DeviceLinkPollStatus } from '@/lib/auth/client'

/**
 * The new device's own screen — reached with no session at all (see `proxy.ts`'s `PUBLIC_PATHS`).
 * Auto-starts on mount, since there's nothing else to do here: shows a code and a QR encoding the
 * same code, then polls until a trusted device approves it (`/settings/approve-device`) or the
 * code expires. `pollDeviceLink` is what actually creates and cookies *this* device's session —
 * approval alone can't, since only a response to this device's own request lands in this device's
 * own cookie jar — so once a poll reports `claimed`, this device already has a real session and
 * just needs to land somewhere; `/` (proxy.ts) sends it into profile selection from there, same as
 * any other valid-session/no-chosen-profile device.
 */

const POLL_INTERVAL_MS = 2500

type State =
  | { phase: 'starting' }
  | { phase: 'waiting'; id: string; code: string; expiresAt: string }
  | { phase: 'claimed' }
  | { phase: 'expired' }
  | { phase: 'error'; message: string }

function formatCode(code: string): string {
  return code.match(/.{1,3}/g)?.join('-') ?? code
}

export default function LinkDevicePage() {
  const [state, setState] = useState<State>({ phase: 'starting' })
  const router = useRouter()
  const pollingId = useRef<string | null>(null)

  // The retry button's own click handler is free to setState synchronously (it's an event
  // handler, not an effect) — this only needs to skip straight to the fetch.
  async function begin() {
    const result = await startDeviceLink()
    if (!result.data) {
      setState({ phase: 'error', message: result.error })
      return
    }
    setState({ phase: 'waiting', ...result.data })
  }

  function retry() {
    setState({ phase: 'starting' })
    void begin()
  }

  useEffect(() => {
    void (async () => {
      await begin()
    })()
  }, [])

  useEffect(() => {
    if (state.phase !== 'waiting') return
    pollingId.current = state.id

    const interval = setInterval(async () => {
      const result = await pollDeviceLink(state.id)
      // A response for an id this effect has already moved past (a slow request outlasting a
      // "generate a new code" retry) — the state it would apply no longer applies to anything.
      if (pollingId.current !== state.id) return
      if (!result.data) return // transient network hiccup — the next tick tries again

      const status: DeviceLinkPollStatus = result.data.status
      if (status === 'claimed') {
        clearInterval(interval)
        setState({ phase: 'claimed' })
        router.push('/')
      } else if (status === 'expired') {
        clearInterval(interval)
        setState({ phase: 'expired' })
      }
      // 'pending'/'approved' — keep polling.
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [state, router])

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <Wordmark className="mx-auto" />

        <h1 className="display mt-9 text-[1.75rem]">Link this device</h1>

        {state.phase === 'starting' && (
          <p className="mt-4 text-[0.875rem] text-ink-muted">Getting a code…</p>
        )}

        {state.phase === 'error' && (
          <>
            <p className="mt-4 text-[0.875rem] text-vermilion">{state.message}</p>
            <RetryButton onClick={retry} />
          </>
        )}

        {state.phase === 'expired' && (
          <>
            <p className="mt-4 text-[0.875rem] text-ink-muted">
              This code has expired. Generate a new one.
            </p>
            <RetryButton onClick={retry} />
          </>
        )}

        {state.phase === 'claimed' && (
          <p className="mt-4 text-[0.875rem] text-ink-muted">Signed in — taking you in…</p>
        )}

        {state.phase === 'waiting' && (
          <>
            <p className="mt-4 text-[0.875rem] text-ink-muted">
              Enter this code on a device where you&apos;re already signed in, or scan the QR.
            </p>

            <p className="mt-8 font-mono text-[2rem] tracking-[0.15em] text-ink">
              {formatCode(state.code)}
            </p>

            <div className="mx-auto mt-8 w-fit bg-white p-4">
              <QRCodeSVG
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/settings/approve-device?code=${state.code}`}
                size={176}
                fgColor="#000000"
                bgColor="#ffffff"
              />
            </div>

            <p className="label mt-8 flex items-center justify-center gap-2 text-ink-muted">
              <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-vermilion" />
              Waiting for approval…
            </p>
          </>
        )}
      </div>
    </main>
  )
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'label mt-6 border border-rule px-4 py-2.5 text-ink-muted transition-colors hover:border-vermilion hover:text-vermilion',
      )}
    >
      Generate a new code
    </button>
  )
}
