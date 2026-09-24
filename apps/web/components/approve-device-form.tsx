'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'
import { lookupDeviceLink, approveDeviceLink, type DeviceLinkLookup } from '@/lib/auth/client'
import { summarizeUserAgent } from '@/lib/user-agent'
import { formatAgo } from '@/lib/format-date'

/**
 * Shared by `/settings` (blank entry form) and `/settings/approve-device` (pre-filled from a QR
 * scan's `?code=`) — the trusted device's half of device linking. Deliberately two steps, not one:
 * `lookupDeviceLink` is read-only and just fetches what the code would approve (browser/device,
 * how long ago it was requested), so the reader sees exactly what they're about to approve before
 * `approveDeviceLink` — the actual state-changing call — ever fires. Approving is what lets a new
 * device sign in with no OTP at all, so skipping straight from "code entered" to "approved" was
 * the design flaw the original plan had before this two-step shape replaced it.
 */

function normalizeCode(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

type State =
  | { step: 'entry'; code: string; error: string | null }
  | { step: 'looking-up'; code: string }
  | { step: 'confirm'; code: string; info: DeviceLinkLookup }
  | { step: 'approving'; code: string; info: DeviceLinkLookup }
  | { step: 'approved' }

export function ApproveDeviceForm({ initialCode }: { initialCode?: string }) {
  const normalizedInitial = initialCode ? normalizeCode(initialCode) : ''
  const [state, setState] = useState<State>({ step: 'entry', code: normalizedInitial, error: null })

  async function lookup(code: string) {
    setState({ step: 'looking-up', code })
    const result = await lookupDeviceLink(code)
    if (!result.data) {
      setState({ step: 'entry', code, error: result.error })
      return
    }
    setState({ step: 'confirm', code, info: result.data })
  }

  // Auto-lookup only the code the QR link itself pre-filled — not every keystroke on the entry
  // form, which stays an explicit-submit form like every other form in this app.
  useEffect(() => {
    if (normalizedInitial.length !== 9) return
    void (async () => {
      await lookup(normalizedInitial)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state.step !== 'entry') return
    const code = normalizeCode(state.code)
    if (code.length !== 9) {
      setState({ step: 'entry', code, error: 'Enter the 9-character code shown on the other device.' })
      return
    }
    void lookup(code)
  }

  async function handleApprove() {
    if (state.step !== 'confirm') return
    setState({ step: 'approving', code: state.code, info: state.info })
    const result = await approveDeviceLink(state.code)
    if (!result.data) {
      setState({ step: 'entry', code: state.code, error: result.error })
      return
    }
    setState({ step: 'approved' })
  }

  function handleCancel() {
    if (state.step !== 'confirm') return
    setState({ step: 'entry', code: '', error: null })
  }

  if (state.step === 'approved') {
    return (
      <div className="sheet px-5 py-5">
        <p className="text-[0.9375rem] text-ink">Device approved.</p>
        <p className="mt-1.5 text-[0.8125rem] text-ink-muted">
          It should sign in within a few seconds.
        </p>
      </div>
    )
  }

  if (state.step === 'confirm' || state.step === 'approving') {
    const { info } = state
    return (
      <div className="sheet px-5 py-5">
        <p className="label text-ink-muted">Approve this sign-in?</p>
        <p className="mt-2.5 text-[0.9375rem] text-ink">{summarizeUserAgent(info.requestUserAgent)}</p>
        <p className="mt-1 text-[0.8125rem] text-ink-muted">
          Requested {formatAgo(info.createdAt)}
        </p>

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={handleCancel}
            disabled={state.step === 'approving'}
            className="label flex-1 border border-rule px-4 py-2.5 text-ink-muted transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={state.step === 'approving'}
            className="label flex-1 bg-ink px-4 py-2.5 text-paper transition-opacity disabled:opacity-50"
          >
            {state.step === 'approving' ? 'Approving…' : 'Approve'}
          </button>
        </div>
      </div>
    )
  }

  const looking = state.step === 'looking-up'
  const code = state.code
  const error = state.step === 'entry' ? state.error : null

  return (
    <form className="sheet px-5 py-5" onSubmit={handleSubmit}>
      <label className="block">
        <span className="label flex items-baseline justify-between text-ink-muted">
          Approve a device
          <span className="text-ink-muted/60 normal-case">9-character code</span>
        </span>
        <input
          type="text"
          value={code}
          onChange={e => setState({ step: 'entry', code: e.target.value, error: null })}
          placeholder="K7M-3XQ-RPT"
          disabled={looking}
          className={cn(
            'mt-2.5 w-full border-b border-ink/25 bg-transparent py-2.5 font-mono text-[1.0625rem] tracking-[0.15em] uppercase transition-colors placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none disabled:opacity-50',
          )}
        />
      </label>
      {error && <p className="mt-3 text-[0.8125rem] text-vermilion">{error}</p>}

      <button
        type="submit"
        disabled={looking || normalizeCode(code).length !== 9}
        className="label mt-5 w-full bg-ink px-4 py-2.5 text-paper transition-opacity disabled:opacity-35"
      >
        {looking ? 'Looking up…' : 'Continue'}
      </button>
    </form>
  )
}
