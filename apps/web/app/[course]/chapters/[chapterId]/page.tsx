import type { Metadata } from 'next'

import { CourseAccess } from '@/components/course-access'
import { PracticeRoom } from '@/components/practice-room'

type Params = { chapterId: string }

// A chapter code (`1.6`) is already human-readable straight off the URL — same reasoning as the
// batch route's generateMetadata (app/[course]/(app)/admin/batches/[batchCode]/page.tsx).
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { chapterId } = await params
  return { title: decodeURIComponent(chapterId) }
}

export default async function ChapterPage({ params }: { params: Promise<Params> }) {
  const { chapterId } = await params

  // Outside the (app) shell, but it is still a signed-in page in a course, so it gets the same
  // "are you part of this course?" check.
  return (
    <CourseAccess>
      <PracticeRoom chapterId={decodeURIComponent(chapterId)} />
    </CourseAccess>
  )
}
