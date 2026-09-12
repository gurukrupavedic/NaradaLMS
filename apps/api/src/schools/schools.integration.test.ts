import { afterEach, describe, expect, it } from 'vitest'

import { publicDb } from '@narada/db'

import { destroyTestWorld } from '../testing/cleanup'
import { pgErrorCode } from '../testing/concurrency'
import { createTestSchool, type TestWorld } from '../testing/fixtures'
import * as repository from './repository'
import { findAllSchools, updateSchool } from './service'

let world: TestWorld | undefined
let otherWorld: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
  if (otherWorld) {
    await destroyTestWorld(otherWorld)
    otherWorld = undefined
  }
})

describe('schools admin (real gap: GET/PATCH /schools)', () => {
  it('findAllSchools includes a newly provisioned school, projected to id/name/slug/createdAt only', async () => {
    world = await createTestSchool({ name: 'Gurukrupa Vedic', slug: 'gurukrupa-vedic-int' })

    const schools = await findAllSchools({ db: publicDb })

    const found = schools.find(s => s.id === world!.orgId)
    expect(found).toEqual({
      id: world.orgId,
      name: 'Gurukrupa Vedic',
      slug: 'gurukrupa-vedic-int',
      createdAt: expect.any(Date),
    })
  })

  it('updateSchool renames a school', async () => {
    world = await createTestSchool({ name: 'Old Name' })

    const updated = await updateSchool({ db: publicDb }, world.orgId, { name: 'New Name' })

    expect(updated.name).toBe('New Name')
    const reread = await repository.findById(publicDb, world.orgId)
    expect(reread?.name).toBe('New Name')
  })

  it('updateSchool changes a slug to one that is free', async () => {
    world = await createTestSchool()
    const newSlug = `renamed-${world.orgId}`

    const updated = await updateSchool({ db: publicDb }, world.orgId, { slug: newSlug })

    expect(updated.slug).toBe(newSlug)
  })

  it('updateSchool throws 404 for a nonexistent school id', async () => {
    await expect(
      updateSchool({ db: publicDb }, 'no-such-school-id', { name: 'X' }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('updateSchool throws 409 when the new slug is already taken by a different school (precheck)', async () => {
    world = await createTestSchool()
    otherWorld = await createTestSchool()
    const otherSchool = await repository.findById(publicDb, otherWorld.orgId)

    await expect(
      updateSchool({ db: publicDb }, world.orgId, { slug: otherSchool!.slug }),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it(
    'the database enforces slug uniqueness independently of the service precheck — a direct ' +
      'concurrent-style update still 23505s rather than silently succeeding',
    async () => {
      world = await createTestSchool()
      otherWorld = await createTestSchool()
      const otherSchool = await repository.findById(publicDb, otherWorld.orgId)

      await expect(
        repository.update(publicDb, world.orgId, { slug: otherSchool!.slug }),
      ).rejects.toSatisfy((error: unknown) => pgErrorCode(error) === '23505')
    },
  )
})
