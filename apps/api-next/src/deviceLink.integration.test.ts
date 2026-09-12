import { afterEach, describe, expect, it } from 'vitest'
import { eq, inArray } from 'drizzle-orm'

import { deviceLinkCode, publicDb } from '@narada/db'
import { sweepExpiredDeviceLinkCodes } from '@narada/auth'

import { createTestSchool, createUser } from './testing/fixtures'
import { destroyTestWorld } from './testing/cleanup'
import type { TestWorld } from './testing/fixtures'

let world: TestWorld | undefined
const createdCodeIds: string[] = []

async function insertCode(overrides: Partial<typeof deviceLinkCode.$inferInsert>) {
  const rows = await publicDb
    .insert(deviceLinkCode)
    .values({
      code: `TEST${crypto.randomUUID().slice(0, 5).toUpperCase()}`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      ...overrides,
    })
    .returning()
  const row = rows.at(0)
  if (!row) throw new Error('insertCode: insert returned no row')
  createdCodeIds.push(row.id)
  return row
}

afterEach(async () => {
  if (createdCodeIds.length > 0) {
    await publicDb.delete(deviceLinkCode).where(inArray(deviceLinkCode.id, createdCodeIds))
    createdCodeIds.length = 0
  }
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('sweepExpiredDeviceLinkCodes', () => {
  it('expires an abandoned pending code past its expiresAt', async () => {
    const row = await insertCode({ status: 'pending', expiresAt: new Date(Date.now() - 1000) })

    const count = await sweepExpiredDeviceLinkCodes()

    expect(count).toBeGreaterThanOrEqual(1)
    const updated = await publicDb.query.deviceLinkCode.findFirst({ where: eq(deviceLinkCode.id, row.id) })
    expect(updated?.status).toBe('expired')
  })

  it('expires an approved-but-never-claimed code past its expiresAt', async () => {
    world = await createTestSchool()
    const user_ = await createUser(world)
    const row = await insertCode({
      status: 'approved',
      userId: user_.id,
      approvedAt: new Date(),
      expiresAt: new Date(Date.now() - 1000),
    })

    await sweepExpiredDeviceLinkCodes()

    const updated = await publicDb.query.deviceLinkCode.findFirst({ where: eq(deviceLinkCode.id, row.id) })
    expect(updated?.status).toBe('expired')
  })

  it('leaves a not-yet-expired pending code and an already-claimed code untouched', async () => {
    const stillPending = await insertCode({
      status: 'pending',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })
    const claimed = await insertCode({
      status: 'claimed',
      expiresAt: new Date(Date.now() - 1000),
      claimedAt: new Date(),
    })

    await sweepExpiredDeviceLinkCodes()

    const rows = await publicDb.query.deviceLinkCode.findMany({
      where: inArray(deviceLinkCode.id, [stillPending.id, claimed.id]),
    })
    expect(rows.find(r => r.id === stillPending.id)?.status).toBe('pending')
    expect(rows.find(r => r.id === claimed.id)?.status).toBe('claimed')
  })
})
