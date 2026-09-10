import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDbClient } from '@narada/db'

import { findById } from './service'
import * as repository from './repository'

vi.mock('./repository', () => ({
  findById: vi.fn(),
}))

// Avoids pulling in @narada/storage's real R2 client (and its env-var validation) for a unit test
// that never needs an actual signed URL.
vi.mock('../utils/contentStorage', () => ({
  signedDownloadUrl: vi.fn(async (objectKey: string) => `https://signed.example/${objectKey}`),
}))

describe('findById', () => {
  const db = {} as SchoolDbClient
  const context = { db }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns the chapter, with its content, when found', async () => {
    const row = {
      id: 'chapter-1',
      trackId: 'track-1',
      code: 'C1',
      title: 'Chapter One',
      status: 'published' as const,
      order: 1,
      script: null,
      archived: false,
      scripts: [],
      audioAssets: [],
    }
    vi.mocked(repository.findById).mockResolvedValue(row)

    await expect(findById(context, 'chapter-1', { kind: 'learnerPreview' })).resolves.toEqual({
      id: 'chapter-1',
      trackId: 'track-1',
      code: 'C1',
      title: 'Chapter One',
      status: 'published',
      order: 1,
      script: null,
      scripts: [],
      audio: [],
    })
    expect(repository.findById).toHaveBeenCalledWith(db, 'chapter-1', { kind: 'learnerPreview' })
  })

  it('404s a draft chapter hidden from this view, exactly like a nonexistent one', async () => {
    vi.mocked(repository.findById).mockResolvedValue(undefined)

    await expect(
      findById(context, 'chapter-1', { kind: 'learnerPreview' }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})
