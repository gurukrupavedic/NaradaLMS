import type { Metadata } from 'next'

import { ExamsScreen } from '@/components/exams-screen'

export const metadata: Metadata = { title: 'Record' }

export default function ExamsPage() {
  return <ExamsScreen />
}
