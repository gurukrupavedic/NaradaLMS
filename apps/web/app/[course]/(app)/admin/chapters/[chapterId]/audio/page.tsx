import type { Metadata } from 'next'

import { ChapterAudioWorkspace } from '@/components/admin/chapter-audio-workspace'

export const metadata: Metadata = { title: 'Audio mapping' }

export default async function ChapterAudioPage({
  params,
}: {
  params: Promise<{ chapterId: string }>
}) {
  const { chapterId } = await params

  return <ChapterAudioWorkspace chapterId={chapterId} />
}
