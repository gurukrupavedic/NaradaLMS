import type { Metadata } from 'next'

import { TrackEditor } from '@/components/admin/track-editor'

// See app/(app)/tracks/[trackId]/page.tsx's own metadata comment — same UUID, same reason not to
// put it in a tab title.
export const metadata: Metadata = { title: 'Admin · Track' }

export default async function AdminTrackPage({
  params,
}: {
  params: Promise<{ trackId: string }>
}) {
  const { trackId } = await params

  return <TrackEditor trackId={trackId} />
}
