import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDbClient } from '@narada/db'

import { findAll, findById } from './service'
import * as repository from './repository'

vi.mock('./repository', () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
}))

const db = {} as SchoolDbClient
const context = { db }

beforeEach(() => {
  vi.resetAllMocks()
})

describe('findAll', () => {
  it('delegates straight through to the repository', async () => {
    const tracks = [{ id: 'track-1', name: 'Track One', order: 1, chapters: [] }]
    vi.mocked(repository.findAll).mockResolvedValue(tracks)

    await expect(findAll(context, { kind: 'learnerPreview' })).resolves.toEqual(tracks)
    expect(repository.findAll).toHaveBeenCalledWith(db, { kind: 'learnerPreview' })
  })

  it('an empty school still returns an empty array, not an error', async () => {
    vi.mocked(repository.findAll).mockResolvedValue([])

    await expect(findAll(context, { kind: 'learnerPreview' })).resolves.toEqual([])
  })
})

describe('findById', () => {
  it('returns the track when found', async () => {
    const track = { id: 'track-1', name: 'Track One', order: 1, chapters: [] }
    vi.mocked(repository.findById).mockResolvedValue(track)

    await expect(findById(context, 'track-1', { kind: 'authoring' })).resolves.toEqual(track)
  })

  it('404s a nonexistent track', async () => {
    vi.mocked(repository.findById).mockResolvedValue(undefined)

    await expect(
      findById(context, 'track-1', { kind: 'authoring' }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})
