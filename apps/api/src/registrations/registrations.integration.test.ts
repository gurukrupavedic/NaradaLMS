import { afterEach, describe, expect, it } from 'vitest'

import { destroyTestWorld } from '../testing/cleanup'
import { createProfile, createRegistration, createTestSchool, type TestWorld } from '../testing/fixtures'
import { approve, findAll, findById, reject, submit } from './service'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('submit', () => {
  it('creates a pending registration with the given fields', async () => {
    world = await createTestSchool()

    const row = await submit(
      { db: world.schoolDb },
      {
        firstName: 'Anjali',
        lastName: 'Rao',
        phone: '+15551234567',
        spokenLanguages: ['Telugu'],
        readLanguages: [],
        parentNames: ['Parent One'],
      },
    )

    expect(row.status).toBe('pending')
    expect(row.firstName).toBe('Anjali')
    expect(row.spokenLanguages).toEqual(['Telugu'])
    expect(row.parentNames).toEqual(['Parent One'])
    await expect(findById({ db: world.schoolDb }, row.id)).resolves.toMatchObject({ id: row.id })
  })

  it('defaults array fields to empty and optional fields to null when omitted', async () => {
    world = await createTestSchool()

    const row = await submit(
      { db: world.schoolDb },
      { firstName: 'Anjali', lastName: 'Rao', phone: '+15551234567' },
    )

    expect(row.spokenLanguages).toEqual([])
    expect(row.readLanguages).toEqual([])
    expect(row.parentNames).toEqual([])
    expect(row.email).toBeNull()
    expect(row.yearOfBirth).toBeNull()
  })
})

describe('findAll', () => {
  it('filters by status', async () => {
    world = await createTestSchool()
    await createRegistration(world, { status: 'pending' })
    const approved = await createRegistration(world, { status: 'approved' })

    const result = await findAll({ db: world.schoolDb }, { status: 'approved', limit: 20 })

    expect(result.items.map(item => item.id)).toEqual([approved.id])
  })

  it('paginates newest-first with a cursor', async () => {
    world = await createTestSchool()
    const first = await createRegistration(world)
    const second = await createRegistration(world)

    const page1 = await findAll({ db: world.schoolDb }, { limit: 1 })
    expect(page1.items.map(item => item.id)).toEqual([second.id])
    expect(page1.nextCursor).not.toBeNull()

    // Following the pattern in batches.integration.test.ts: the cursor is reconstructed directly
    // from the last item's own sort key rather than decoding the opaque nextCursor string — that
    // encoding is utils/cursor.ts's own concern, already tested there.
    const page2 = await findAll(
      { db: world.schoolDb },
      { limit: 1, cursor: { createdAt: second.createdAt, id: second.id } },
    )
    expect(page2.items.map(item => item.id)).toEqual([first.id])
  })
})

describe('approve', () => {
  it('transitions a pending registration to approved and records the reviewer', async () => {
    world = await createTestSchool()
    const reviewer = await createProfile(world)
    const pending = await createRegistration(world)

    const row = await approve({ db: world.schoolDb }, pending.id, reviewer.id)

    expect(row.status).toBe('approved')
    expect(row.reviewedBy).toBe(reviewer.id)
    expect(row.reviewedAt).not.toBeNull()
  })

  it('rejects with 404 for a nonexistent registration', async () => {
    world = await createTestSchool()

    await expect(
      approve({ db: world.schoolDb }, crypto.randomUUID(), null),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('rejects with 409 when the registration was already reviewed', async () => {
    world = await createTestSchool()
    const alreadyApproved = await createRegistration(world, { status: 'approved' })

    await expect(
      approve({ db: world.schoolDb }, alreadyApproved.id, null),
    ).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('reject', () => {
  it('transitions a pending registration to rejected', async () => {
    world = await createTestSchool()
    const pending = await createRegistration(world)

    const row = await reject({ db: world.schoolDb }, pending.id, null)

    expect(row.status).toBe('rejected')
    expect(row.reviewedAt).not.toBeNull()
  })
})
