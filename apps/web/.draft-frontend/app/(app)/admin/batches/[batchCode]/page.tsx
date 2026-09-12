import type { Metadata } from 'next'

import { BatchDetail } from '@/components/admin/batch-detail'

type Params = { batchCode: string }

// Unlike the track routes' UUIDs, a batch code (`VED-01-2026-BR-1`) is already the human-readable
// identifier — reading it straight off the URL param needs no data fetch, so there's no reason to
// fall back to a generic title the way those do.
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { batchCode } = await params
  return { title: decodeURIComponent(batchCode) }
}

export default async function AdminBatchPage({ params }: { params: Promise<Params> }) {
  const { batchCode } = await params

  return <BatchDetail code={decodeURIComponent(batchCode)} />
}
