import { afterEach, describe, expect, it } from 'vitest'

import { destroyTestWorld } from '../cleanup'
import { createProfile, createTestSchool, type TestWorld } from '../fixtures'

let worldA: TestWorld | undefined
let worldB: TestWorld | undefined

afterEach(async () => {
  if (worldA) {
    await destroyTestWorld(worldA)
    worldA = undefined
  }
  if (worldB) {
    await destroyTestWorld(worldB)
    worldB = undefined
  }
})

describe('school schema isolation', () => {
  it("world1.schoolDb cannot see world2's data, and vice versa", async () => {
    worldA = await createTestSchool()
    worldB = await createTestSchool()

    const profileA = await createProfile(worldA, { name: 'Only In A' })
    const profileB = await createProfile(worldB, { name: 'Only In B' })

    // Each world's client only ever sees its own schema (search_path is per-connection-pool).
    const seenFromA = await worldA.schoolDb.query.profile.findFirst({
      where: (t, { eq }) => eq(t.id, profileB.id),
    })
    expect(seenFromA).toBeUndefined()

    const seenFromB = await worldB.schoolDb.query.profile.findFirst({
      where: (t, { eq }) => eq(t.id, profileA.id),
    })
    expect(seenFromB).toBeUndefined()

    // Sanity: each world does see its own row.
    const ownA = await worldA.schoolDb.query.profile.findFirst({
      where: (t, { eq }) => eq(t.id, profileA.id),
    })
    expect(ownA?.name).toBe('Only In A')

    const ownB = await worldB.schoolDb.query.profile.findFirst({
      where: (t, { eq }) => eq(t.id, profileB.id),
    })
    expect(ownB?.name).toBe('Only In B')

    // A full unfiltered scan of "profile" from each world's connection also only returns that
    // world's own rows — proves isolation is structural (separate schema), not just id-filtering.
    const allFromA = await worldA.schoolDb.query.profile.findMany()
    expect(allFromA.map(p => p.id)).toEqual([profileA.id])

    const allFromB = await worldB.schoolDb.query.profile.findMany()
    expect(allFromB.map(p => p.id)).toEqual([profileB.id])
  })
})
