'use client'

import { useSearchParams } from 'next/navigation'

import { ApproveDeviceForm } from '@/components/approve-device-form'

// Split out of the approve-device page itself only because `useSearchParams` needs a Suspense
// boundary around whatever reads it — kept `ApproveDeviceForm` itself free of `next/navigation` so
// it stays the same component the plain `/settings` entry form uses with no query string at all.
export function ApproveDeviceFromQuery() {
  const code = useSearchParams().get('code')
  return <ApproveDeviceForm initialCode={code ?? undefined} />
}
