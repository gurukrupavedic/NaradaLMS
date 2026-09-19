import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDbClient } from '@narada/db'

import { findAll, findById, reorderChapters } from './service'
import * as repository from './repository'
import * as chapterRepository from '../chapters/repository'

vi.mock('./repository', () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
}))

vi.mock('../chapters/repository', () => ({
  findActiveChapterIds: vi.fn(),
  reorderChapters: vi.fn(),
}))

const db = {
  transaction: (cb: (tx: SchoolDbClient) => Promise<unknown>) => cb(db as SchoolDbClient),
} as unknown as SchoolDbClient
const context = { db }

beforeEach(() => {
  vi.resetAllMocks()
})

describe('findAll', () => {
  it('delegates straight through to the repository, limited to the course', async () => {
    const tracks = [{ id: 'track-1', courseId: 'course-1', name: 'Track One', order: 1, chapters: [] }]
    vi.mocked(repository.findAll).mockResolvedValue(tracks)

    await expect(findAll(context, { kind: 'learnerPreview' }, 'course-1')).resolves.toEqual(tracks)
    expect(repository.findAll).toHaveBeenCalledWith(db, { kind: 'learnerPreview' }, 'course-1')
  })

  it('an empty school still returns an empty array, not an error', async () => {
    vi.mocked(repository.findAll).mockResolvedValue([])

    await expect(findAll(context, { kind: 'learnerPreview' }, 'course-1')).resolves.toEqual([])
  })
})

describe('findById', () => {
  it('returns the track when found', async () => {
    const track = { id: 'track-1', courseId: 'course-1', name: 'Track One', order: 1, chapters: [] }
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

describe('reorderChapters', () => {
  const track = { id: 'track-1', courseId: 'course-1', name: 'Track One', order: 1, chapters: [] }

  it('reorders when the submitted ids exactly match the active set', async () => {
    vi.mocked(repository.findById).mockResolvedValue(track)
    vi.mocked(chapterRepository.findActiveChapterIds).mockResolvedValue(['c1', 'c2'])

    await expect(reorderChapters(context, 'track-1', ['c2', 'c1'])).resolves.toEqual(track)
    expect(chapterRepository.reorderChapters).toHaveBeenCalledWith(db, ['c2', 'c1'])
  })

  it('rejects a payload missing one active chapter, writing nothing', async () => {
    vi.mocked(repository.findById).mockResolvedValue(track)
    vi.mocked(chapterRepository.findActiveChapterIds).mockResolvedValue(['c1', 'c2'])

    await expect(reorderChapters(context, 'track-1', ['c1'])).rejects.toMatchObject({ statusCode: 422 })
    expect(chapterRepository.reorderChapters).not.toHaveBeenCalled()
  })

  it('rejects a payload naming an id that is not an active chapter on this track', async () => {
    vi.mocked(repository.findById).mockResolvedValue(track)
    vi.mocked(chapterRepository.findActiveChapterIds).mockResolvedValue(['c1', 'c2'])

    await expect(reorderChapters(context, 'track-1', ['c1', 'c2', 'foreign'])).rejects.toMatchObject({
      statusCode: 422,
    })
    expect(chapterRepository.reorderChapters).not.toHaveBeenCalled()
  })

  it('404s a nonexistent track', async () => {
    vi.mocked(repository.findById).mockResolvedValue(undefined)

    await expect(reorderChapters(context, 'track-1', ['c1'])).rejects.toMatchObject({ statusCode: 404 })
  })
})
