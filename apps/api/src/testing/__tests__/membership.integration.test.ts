import { and, eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { member, publicDb } from '@narada/db'

import { pgErrorCode } from '../concurrency'
import { destroyTestWorld } from '../cleanup'
import { createMembership, createTestSchool, createUser, type TestWorld } from '../fixtures'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

// H4 added a composite unique index on member(organizationId, userId) — a second membership
// for the same org/user now fails at the database, regardless of role.
describe('member(organizationId, userId) uniqueness — H4 applied', () => {
  it('rejects a second member row for the same (organizationId, userId) with the same role', async () => {
    world = await createTestSchool()
    const userRow = await createUser(world)

    await createMembership(world, userRow.id, { role: 'member' })

    await expect(createMembership(world, userRow.id, { role: 'member' })).rejects.toSatisfy(
      (error: unknown) => pgErrorCode(error) === '23505',
    )

    const rows = await publicDb
      .select()
      .from(member)
      .where(and(eq(member.organizationId, world.orgId), eq(member.userId, userRow.id)))
    expect(rows).toHaveLength(1)
  })

  it('rejects a second member row for the same (organizationId, userId) with a conflicting role', async () => {
    world = await createTestSchool()
    const userRow = await createUser(world)

    await createMembership(world, userRow.id, { role: 'admin' })

    await expect(createMembership(world, userRow.id, { role: 'member' })).rejects.toSatisfy(
      (error: unknown) => pgErrorCode(error) === '23505',
    )

    const rows = await publicDb
      .select()
      .from(member)
      .where(and(eq(member.organizationId, world.orgId), eq(member.userId, userRow.id)))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.role).toBe('admin')
  })
})
