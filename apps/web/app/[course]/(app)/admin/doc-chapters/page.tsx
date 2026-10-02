import type { Metadata } from 'next'

import { AdminDocChaptersScreen } from '@/components/admin/admin-doc-chapters-screen'

export const metadata: Metadata = { title: 'Doc chapters' }

export default function AdminDocChaptersPage() {
  return <AdminDocChaptersScreen />
}
