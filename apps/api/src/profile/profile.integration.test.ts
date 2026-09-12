import { afterEach, describe, expect, it } from 'vitest'

import { publicDb } from '@narada/db'

import { destroyTestWorld } from '../testing/cleanup'
import { createMembership, createTestSchool, createUser, type TestWorld } from '../testing/fixtures'
import { getAuthProfile } from './service'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('getAuthProfile', () => {
  it("returns every organization the user is a member of, with that org's name/slug/role", async () => {
    world = await createTestSchool({ name: 'Gurukrupa Vedic', slug: 'gurukrupa-vedic' })
    const userRow = await createUser(world)
    await createMembership(world, userRow.id, { role: 'owner' })

    const authProfile = await getAuthProfile(publicDb, userRow.id, false)

    expect(authProfile).toEqual({
      isSuperAdmin: false,
      memberships: [
        {
          organizationId: world.orgId,
          organizationName: 'Gurukrupa Vedic',
          organizationSlug: 'gurukrupa-vedic',
          role: 'owner',
        },
      ],
    })
  })

  it('returns an empty membership list for a user in no organizations, not an error', async () => {
    world = await createTestSchool()
    const userRow = await createUser(world)

    await expect(getAuthProfile(publicDb, userRow.id, false)).resolves.toEqual({
      isSuperAdmin: false,
      memberships: [],
    })
  })

  it('lists every organization when the user belongs to more than one', async () => {
    world = await createTestSchool()
    const otherWorld = await createTestSchool()
    const userRow = await createUser(world)
    await createMembership(world, userRow.id, { role: 'admin' })
    // A second world's fixtures aren't torn down by `destroyTestWorld(world)` above, so tear this
    // one down too — otherwise its schema/org leak past this test.
    try {
      await createMembership(otherWorld, userRow.id, { role: 'member' })

      const authProfile = await getAuthProfile(publicDb, userRow.id, true)

      expect(authProfile.isSuperAdmin).toBe(true)
      expect(authProfile.memberships).toHaveLength(2)
      expect(authProfile.memberships.map(m => m.organizationId).sort()).toEqual(
        [world.orgId, otherWorld.orgId].sort(),
      )
    } finally {
      await destroyTestWorld(otherWorld)
    }
  })
})
