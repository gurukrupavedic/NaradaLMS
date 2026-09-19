import { afterEach, describe, expect, it } from 'vitest'

import { destroyTestWorld } from '../testing/cleanup'
import {
  createBatch,
  createTestSchool,
  createTrack,
  defaultCourseId,
  type TestWorld,
} from '../testing/fixtures'
import { findOpenBatches } from './service'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('findOpenBatches', () => {
  it('includes an upcoming batch', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const upcoming = await createBatch(world, track, { status: 'upcoming' })

    const items = await findOpenBatches({ db: world.schoolDb }, await defaultCourseId(world))

    expect(items.map(item => item.id)).toEqual([upcoming.id])
  })

  it('includes an active batch', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const active = await createBatch(world, track, { status: 'active' })

    const items = await findOpenBatches({ db: world.schoolDb }, await defaultCourseId(world))

    expect(items.map(item => item.id)).toEqual([active.id])
  })

  it('excludes a completed batch', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    await createBatch(world, track, { status: 'completed' })

    await expect(findOpenBatches({ db: world.schoolDb }, await defaultCourseId(world))).resolves.toEqual([])
  })
})
