import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDb } from '@narada/db'

import { resolveQualifyingBatch } from './service'
import * as repository from './repository'

// Explicit factory (rather than vitest's auto-mock) so the real `./repository` module — which
// pulls in `@narada/db` at import time and would trigger real env-var validation — never loads.
vi.mock('./repository', () => ({
  findQualifyingBatches: vi.fn(),
}))

describe('resolveQualifyingBatch', () => {
  const db = {} as SchoolDb

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns the batchId when exactly one batch qualifies', async () => {
    vi.mocked(repository.findQualifyingBatches).mockResolvedValue([{ batchId: 'batch-1' }])

    await expect(resolveQualifyingBatch(db, 'student-1', 'track-1')).resolves.toBe('batch-1')
    expect(repository.findQualifyingBatches).toHaveBeenCalledWith(db, 'student-1', 'track-1')
  })

  it('rejects with a 422 when no batch qualifies', async () => {
    vi.mocked(repository.findQualifyingBatches).mockResolvedValue([])

    await expect(resolveQualifyingBatch(db, 'student-1', 'track-1')).rejects.toMatchObject({
      statusCode: 422,
      message: 'student is not enrolled in a batch for this chapter',
    })
  })

  it('rejects with a 422 when more than one batch qualifies, rather than silently picking one', async () => {
    vi.mocked(repository.findQualifyingBatches).mockResolvedValue([
      { batchId: 'batch-1' },
      { batchId: 'batch-2' },
    ])

    await expect(resolveQualifyingBatch(db, 'student-1', 'track-1')).rejects.toMatchObject({
      statusCode: 422,
      message: "student is enrolled in multiple batches for this chapter's track",
    })
  })
})
