import type { Metadata } from 'next'

import { DocChapterWorkspace } from '@/components/admin/doc-chapter-workspace'

export const metadata: Metadata = { title: 'Doc chapter' }

export default async function DocChapterWorkspacePage({
  params,
}: {
  params: Promise<{ docChapterId: string }>
}) {
  const { docChapterId } = await params

  return <DocChapterWorkspace docChapterId={docChapterId} />
}
