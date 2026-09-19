import type { Metadata } from 'next'

import { CourseGate } from '@/components/course-gate'
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

  // Outside the (app) shell, but it reads the same course-scoped data, so it needs the same gate — a
  // direct link to a chapter must not fire its requests before a course is settled.
  return (
    <CourseGate>
      <PracticeRoom chapterId={decodeURIComponent(chapterId)} />
    </CourseGate>
  )
}
