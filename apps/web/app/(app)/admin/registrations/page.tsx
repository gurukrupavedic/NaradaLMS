import type { Metadata } from 'next'
import { Suspense } from 'react'

import { AdminRegistrationsScreen } from '@/components/admin/admin-registrations-screen'
import { ScreenSkeleton } from '@/components/skeletons'

export const metadata: Metadata = { title: 'Registrations' }

export default function AdminRegistrationsPage() {
  // AdminRegistrationsScreen reads `?view=` via `useSearchParams`, which needs a Suspense
  // boundary around it — same pattern as app/(app)/settings/approve-device/page.tsx.
  return (
    <Suspense fallback={<ScreenSkeleton rows={6} />}>
      <AdminRegistrationsScreen />
    </Suspense>
  )
}
