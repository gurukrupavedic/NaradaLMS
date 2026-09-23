import type { Metadata } from 'next'

import { AdminExamSlotsScreen } from '@/components/admin/admin-exam-slots-screen'

export const metadata: Metadata = { title: 'Exam slots' }

export default function AdminExamSlotsPage() {
  return <AdminExamSlotsScreen />
}
