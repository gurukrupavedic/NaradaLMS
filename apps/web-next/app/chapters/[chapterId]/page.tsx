import type { Metadata } from 'next'

import { PracticeRoom } from '@/components/practice-room'

type Params = { chapterId: string }

// A chapter code (`1.6`) is already human-readable straight off the URL — same reasoning as the
// batch route's generateMetadata (app/(app)/admin/batches/[batchCode]/page.tsx).
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { chapterId } = await params
  return { title: decodeURIComponent(chapterId) }
}

export default async function ChapterPage({ params }: { params: Promise<Params> }) {
  const { chapterId } = await params

  return <PracticeRoom chapterId={decodeURIComponent(chapterId)} />
}
