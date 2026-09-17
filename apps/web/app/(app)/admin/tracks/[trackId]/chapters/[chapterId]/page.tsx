import type { Metadata } from 'next'

import { ChapterAuthoring } from '@/components/admin/chapter-authoring'

export const metadata: Metadata = { title: 'Admin · Chapter content' }

export default async function AdminChapterContentPage({
  params,
}: {
  params: Promise<{ trackId: string; chapterId: string }>
}) {
  const { trackId, chapterId } = await params

  return <ChapterAuthoring trackId={trackId} chapterId={chapterId} />
}
