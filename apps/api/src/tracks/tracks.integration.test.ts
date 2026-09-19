import { afterEach, describe, expect, it } from 'vitest'

import { destroyTestWorld } from '../testing/cleanup'
import {
  createChapter,
  createTestSchool,
  createTrack,
  type TestWorld,
} from '../testing/fixtures'
import { updateChapter } from '../chapters/service'
import { findAll, findById } from './repository'
import { reorderChapters } from './service'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('findAll', () => {
  it('orders tracks by order, each with its chapters ordered by order', async () => {
    world = await createTestSchool()
    const trackB = await createTrack(world, { order: 2 })
    const trackA = await createTrack(world, { order: 1 })
    await createChapter(world, trackA, { order: 2, status: 'published' })
    await createChapter(world, trackA, { order: 1, status: 'published' })

    const tracks = await findAll(world.schoolDb, { kind: 'authoring' })

    expect(tracks.map(t => t.id)).toEqual([trackA.id, trackB.id])
    expect(tracks[0]?.chapters.map(c => c.order)).toEqual([1, 2])
  })

  it('learnerPreview hides draft chapters; authoring shows both', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const published = await createChapter(world, trackRow, { status: 'published' })
    const draft = await createChapter(world, trackRow, { status: 'draft' })

    const learnerView = await findAll(world.schoolDb, { kind: 'learnerPreview' })
    expect(learnerView[0]?.chapters.map(c => c.id)).toEqual([published.id])

    const authoringView = await findAll(world.schoolDb, { kind: 'authoring' })
    expect(authoringView[0]?.chapters.map(c => c.id).sort()).toEqual(
      [published.id, draft.id].sort(),
    )
  })

  it('a track with no visible chapters still appears, with an empty chapters array', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    await createChapter(world, trackRow, { status: 'draft' })

    const learnerView = await findAll(world.schoolDb, { kind: 'learnerPreview' })

    expect(learnerView.map(t => t.id)).toContain(trackRow.id)
    expect(learnerView.find(t => t.id === trackRow.id)?.chapters).toEqual([])
  })
})

describe('findById', () => {
  it('returns the track with visibility-filtered chapters', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    await createChapter(world, trackRow, { status: 'draft' })

    const learnerView = await findById(world.schoolDb, trackRow.id, { kind: 'learnerPreview' })
    expect(learnerView?.chapters).toEqual([])

    const authoringView = await findById(world.schoolDb, trackRow.id, { kind: 'authoring' })
    expect(authoringView?.chapters).toHaveLength(1)
  })

  it('returns undefined for a nonexistent track', async () => {
    world = await createTestSchool()

    await expect(
      findById(world.schoolDb, crypto.randomUUID(), { kind: 'authoring' }),
    ).resolves.toBeUndefined()
  })
})

describe('reorderChapters (service)', () => {
  it('persists a full permutation of the track\'s active chapters', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const c1 = await createChapter(world, trackRow, { order: 0 })
    const c2 = await createChapter(world, trackRow, { order: 1 })
    const c3 = await createChapter(world, trackRow, { order: 2 })

    await reorderChapters({ db: world.schoolDb }, trackRow.id, [c3.id, c1.id, c2.id])

    const track = await findById(world.schoolDb, trackRow.id, { kind: 'authoring' })
    expect(track?.chapters.map(c => c.id)).toEqual([c3.id, c1.id, c2.id])
  })

  it('rejects a payload missing one of the track\'s active chapters, writing nothing', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const c1 = await createChapter(world, trackRow, { order: 0 })
    await createChapter(world, trackRow, { order: 1 })

    await expect(reorderChapters({ db: world.schoolDb }, trackRow.id, [c1.id])).rejects.toMatchObject({
      statusCode: 422,
    })

    const track = await findById(world.schoolDb, trackRow.id, { kind: 'authoring' })
    expect(track?.chapters.map(c => c.order)).toEqual([0, 1])
  })

  it('rejects a payload naming an archived chapter, writing nothing', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const c1 = await createChapter(world, trackRow, { order: 0 })
    const c2 = await createChapter(world, trackRow, { order: 1 })
    const archived = await updateChapter({ db: world.schoolDb }, c2.id, { archived: true })

    await expect(
      reorderChapters({ db: world.schoolDb }, trackRow.id, [c1.id, archived.id]),
    ).rejects.toMatchObject({ statusCode: 422 })

    const refetched = await findById(world.schoolDb, trackRow.id, { kind: 'authoring' })
    expect(refetched?.chapters.map(c => c.id)).toEqual([c1.id])
  })

  it('leaves an archived chapter\'s order untouched by a reorder of the active set', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const c1 = await createChapter(world, trackRow, { order: 0 })
    const c2 = await createChapter(world, trackRow, { order: 1 })
    const toArchive = await createChapter(world, trackRow, { order: 2 })
    const archived = await updateChapter({ db: world.schoolDb }, toArchive.id, { archived: true })

    await reorderChapters({ db: world.schoolDb }, trackRow.id, [c2.id, c1.id])

    const authoringTrack = await findById(world.schoolDb, trackRow.id, { kind: 'authoring' })
    expect(authoringTrack?.chapters.map(c => c.id)).toEqual([c2.id, c1.id])

    // The archived chapter's own order (a very negative sentinel — see
    // `chapters/repository.ts::nextArchivedOrder`) wasn't part of the reorder and stays put.
    expect(archived.order).toBeLessThan(0)
  })

  it('404s a nonexistent track', async () => {
    world = await createTestSchool()

    await expect(
      reorderChapters({ db: world.schoolDb }, crypto.randomUUID(), [crypto.randomUUID()]),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})
