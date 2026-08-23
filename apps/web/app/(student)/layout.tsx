import type { Metadata } from 'next'

import { requireAuthenticatedProfile } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Narada LMS - Student',
}

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireAuthenticatedProfile()
  return children
}
