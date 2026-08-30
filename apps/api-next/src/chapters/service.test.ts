import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDbClient } from '@narada/db'

import { findById } from './service'
import * as repository from './repository'

vi.mock('./repository', () => ({
  findById: vi.fn(),
}))

describe('findById', () => {
  const db = {} as SchoolDbClient
  const context = { db }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns the chapter when found', async () => {
    const chapter = {
      id: 'chapter-1',
      trackId: 'track-1',
      code: 'C1',
      title: 'Chapter One',
      status: 'published' as const,
      order: 1,
      script: null,
    }
    vi.mocked(repository.findById).mockResolvedValue(chapter)

    await expect(findById(context, 'chapter-1', { kind: 'learnerPreview' })).resolves.toEqual(
      chapter,
    )
    expect(repository.findById).toHaveBeenCalledWith(db, 'chapter-1', { kind: 'learnerPreview' })
  })

  it('404s a draft chapter hidden from this view, exactly like a nonexistent one', async () => {
    vi.mocked(repository.findById).mockResolvedValue(undefined)

    await expect(
      findById(context, 'chapter-1', { kind: 'learnerPreview' }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})
