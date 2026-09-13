import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ApproveDeviceFromQuery } from '@/components/approve-device-from-query'

export const metadata: Metadata = { title: 'Approve device' }

export default function ApproveDevicePage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-9">
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
