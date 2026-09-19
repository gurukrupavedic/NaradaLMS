import type { Metadata } from 'next'
import { Suspense } from 'react'

import { Wordmark } from '@/components/app-shell'
import { ApproveDeviceFromQuery } from '@/components/approve-device-from-query'

/**
 * Where a new device's QR code points (`app/link-device`). It sits outside `/<course>/` on purpose:
 * approving a device is about the person's account, not a course, and the QR is generated on a device
 * that has no course at all. It is still behind sign-in (proxy.ts) — that is the whole point of the
 * trusted device. `settings` is one of the reserved first path segments, so a course can never
 * shadow it.
 */
export const metadata: Metadata = { title: 'Approve device' }

export default function ApproveDevicePage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-9">
      <Wordmark className="mb-10 block" />
      <h1 className="display text-[1.75rem]">Approve a device</h1>
      <p className="mt-2 text-[0.875rem] text-ink-muted">
        Scanned from another device&apos;s QR code — confirm it&apos;s yours below.
      </p>

      <div className="mt-8">
        <Suspense fallback={<p className="text-[0.875rem] text-ink-muted">Loading…</p>}>
          <ApproveDeviceFromQuery />
        </Suspense>
      </div>
    </div>
  )
}
