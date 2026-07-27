import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDbClient } from '@narada/db'

import { DbConstraint } from '../utils/dbError'
import { createBatch, updateBatch } from './service'
import * as repository from './repository'

// Explicit factory (rather than vitest's auto-mock) so the real `./repository` module — which
// pulls in `@narada/db` at import time and would trigger real env-var validation — never loads.
vi.mock('./repository', () => ({
  insert: vi.fn(),
  update: vi.fn(),
}))

const db = {} as SchoolDbClient
const context = { db }

describe('createBatch', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('maps batch_trackId_track_id_fk to a 422 with a track-specific message', async () => {
    vi.mocked(repository.insert).mockRejectedValue({
      cause: { code: '23503', constraint: DbConstraint.batchTrackIdFk },
    })

    await expect(
      createBatch(context, { trackId: 'missing-track', code: 'BATCH-1' }),
    ).rejects.toMatchObject({
      statusCode: 422,
      message: 'unknown or invalid track',
    })
  })

  it('maps batch_code_unique to a 409 with a duplicate-code message', async () => {
    vi.mocked(repository.insert).mockRejectedValue({
      cause: { code: '23505', constraint: DbConstraint.batchCodeUnique },
    })

    await expect(
      createBatch(context, { trackId: 'track-1', code: 'DUP' }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'a batch with this code already exists',
    })
  })

  it('rethrows an unrecognized constraint violation unchanged', async () => {
    const original = { cause: { code: '23503', constraint: 'some_other_fk' } }
    vi.mocked(repository.insert).mockRejectedValue(original)

    await expect(createBatch(context, { trackId: 'track-1', code: 'X' })).rejects.toBe(original)
  })
})

describe('updateBatch', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('maps batch_code_unique to a 409 with a duplicate-code message', async () => {
    vi.mocked(repository.update).mockRejectedValue({
      cause: { code: '23505', constraint: DbConstraint.batchCodeUnique },
    })

    await expect(updateBatch(context, 'batch-1', { code: 'DUP' })).rejects.toMatchObject({
      statusCode: 409,
      message: 'a batch with this code already exists',
    })
  })
})
