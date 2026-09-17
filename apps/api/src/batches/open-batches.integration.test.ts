import { afterEach, describe, expect, it } from 'vitest'

import { destroyTestWorld } from '../testing/cleanup'
import { createBatch, createTestSchool, createTrack, type TestWorld } from '../testing/fixtures'
import { findOpenBatches } from './service'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

const HOUR = 60 * 60 * 1000

describe('findOpenBatches', () => {
  it('includes a batch whose enrollment window currently spans now', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const open = await createBatch(world, track, {
      enrollmentOpensAt: new Date(Date.now() - HOUR),
      enrollmentClosesAt: new Date(Date.now() + HOUR),
    })

    const items = await findOpenBatches({ db: world.schoolDb })

    expect(items.map(item => item.id)).toEqual([open.id])
  })

  it('excludes a batch whose window has not opened yet', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    await createBatch(world, track, {
      enrollmentOpensAt: new Date(Date.now() + HOUR),
      enrollmentClosesAt: new Date(Date.now() + 2 * HOUR),
    })

    await expect(findOpenBatches({ db: world.schoolDb })).resolves.toEqual([])
  })

  it('excludes a batch whose window has already closed', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    await createBatch(world, track, {
      enrollmentOpensAt: new Date(Date.now() - 2 * HOUR),
      enrollmentClosesAt: new Date(Date.now() - HOUR),
    })

    await expect(findOpenBatches({ db: world.schoolDb })).resolves.toEqual([])
  })

  it('excludes a batch with no enrollment window set at all', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    await createBatch(world, track)

    await expect(findOpenBatches({ db: world.schoolDb })).resolves.toEqual([])
  })

  it('includes a batch that opened in the past with no scheduled close (open-ended)', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const open = await createBatch(world, track, {
      enrollmentOpensAt: new Date(Date.now() - HOUR),
      enrollmentClosesAt: null,
    })

    const items = await findOpenBatches({ db: world.schoolDb })

    expect(items.map(item => item.id)).toEqual([open.id])
  })

})
