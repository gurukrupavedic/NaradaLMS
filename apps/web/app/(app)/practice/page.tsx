import type { Metadata } from 'next'

import { PracticeScreen } from '@/components/practice-screen'

export const metadata: Metadata = { title: 'Learning' }

export default function PracticePage() {
  return <PracticeScreen />
}
