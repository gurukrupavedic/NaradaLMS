'use server'

import { getBatch } from '@/lib/api/batches'
import type { ApiBatchDetail } from '@/lib/types'

// Fetched on-demand for exactly one batch when an admin opens its detail drawer — never eagerly
// for the whole list, which is the fan-out that previously took the dashboard down.
export async function getBatchDetailAction(batchId: string): Promise<ApiBatchDetail> {
  return getBatch(batchId)
}
