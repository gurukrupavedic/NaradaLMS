import type { Metadata } from 'next'

import { AdminExamsScreen } from '@/components/admin/admin-exams-screen'

export const metadata: Metadata = { title: 'Exams' }

export default function AdminExamsPage() {
  return <AdminExamsScreen />
}
