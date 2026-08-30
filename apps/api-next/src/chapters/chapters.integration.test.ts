import { afterEach, describe, expect, it } from 'vitest'

import { destroyTestWorld } from '../testing/cleanup'
import { createChapter, createTestSchool, createTrack, type TestWorld } from '../testing/fixtures'
import { findById } from './repository'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('findById', () => {
  it('a published chapter is visible under both views', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow, { status: 'published' })

    await expect(
      findById(world.schoolDb, chapterRow.id, { kind: 'learnerPreview' }),
    ).resolves.toMatchObject({ id: chapterRow.id })
    await expect(
      findById(world.schoolDb, chapterRow.id, { kind: 'authoring' }),
    ).resolves.toMatchObject({ id: chapterRow.id })
  })

  it('a draft chapter is invisible under learnerPreview but visible under authoring', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow, { status: 'draft' })

    await expect(
      findById(world.schoolDb, chapterRow.id, { kind: 'learnerPreview' }),
    ).resolves.toBeUndefined()
    await expect(
      findById(world.schoolDb, chapterRow.id, { kind: 'authoring' }),
    ).resolves.toMatchObject({ id: chapterRow.id })
  })

  it('a nonexistent chapter is undefined under either view — same shape as a hidden draft, so a caller can\'t distinguish "hidden" from "does not exist"', async () => {
    world = await createTestSchool()

    await expect(
      findById(world.schoolDb, crypto.randomUUID(), { kind: 'learnerPreview' }),
    ).resolves.toBeUndefined()
  })
})
