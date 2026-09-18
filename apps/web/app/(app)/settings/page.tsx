import type { Metadata } from 'next'
import { Suspense } from 'react'

import { Section } from '@/components/section'
import { ApproveDeviceForm } from '@/components/approve-device-form'
import { LinkedDevicesList } from '@/components/linked-devices-list'
import { LinkedGoogleAccount } from '@/components/linked-google-account'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-12 px-5 py-9">
      <div>
        <h1 className="display text-[1.75rem]">Settings</h1>
      </div>

      <Section title="Google account">
        {/* LinkedGoogleAccount reads the ?error= this route's own /link-social redirect can land
            back with, via useSearchParams — Next requires a Suspense boundary around that. */}
        <Suspense fallback={<p className="text-[0.875rem] text-ink-muted">Loading…</p>}>
          <LinkedGoogleAccount />
        </Suspense>
      </Section>

      <Section title="Link a new device">
        <p className="max-w-md text-[0.875rem] leading-relaxed text-ink-muted">
          On the new device, open <span className="text-ink">/link-device</span> and enter the code
          it shows here, or scan its QR with this device&apos;s camera.
        </p>
        <ApproveDeviceForm />
      </Section>

      <Section title="Linked devices">
        <LinkedDevicesList />
      </Section>
    </div>
  )
}
