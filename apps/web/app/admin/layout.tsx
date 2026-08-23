import type { Metadata } from 'next'

import { requireAuthenticatedProfile } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Narada LMS - Admin',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAuthenticatedProfile()
  return children
}
