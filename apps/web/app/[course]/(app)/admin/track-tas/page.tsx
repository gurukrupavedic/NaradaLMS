import type { Metadata } from 'next'

import { AdminTrackTasScreen } from '@/components/admin/admin-track-tas-screen'

export const metadata: Metadata = { title: 'Track TAs' }

export default function AdminTrackTasPage() {
  return <AdminTrackTasScreen />
}
