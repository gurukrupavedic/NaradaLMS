import { afterEach, describe, expect, it } from 'vitest'

import { publicDb } from '@narada/db'

import { destroyTestWorld } from '../testing/cleanup'
import { createProfile, createRegistration, createTestSchool, createUser, type TestWorld } from '../testing/fixtures'
import { approve, findAll, findById, reject, submit } from './service'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

/** Approving creates a real `user` this test's own `world` never registered as its own —
 * `destroyTestWorld` only deletes public-schema rows it was told about. Fetching the user this
 * approval provisioned and adding it to `world.createdPublicUserIds` (its `member` row is covered
 * for free: `member.organizationId` cascades on the org delete `destroyTestWorld` already does)
 * lets the normal teardown catch it instead of leaking a row into the shared test database. */
async function trackProvisionedUser(world_: TestWorld, phone: string): Promise<{ id: string; email: string }> {
  const row = await publicDb.query.user.findFirst({
    where: (t, { eq }) => eq(t.phoneNumber, phone),
    columns: { id: true, email: true },
  })
  if (!row) throw new Error(`trackProvisionedUser: no user found for phone ${phone}`)
  world_.createdPublicUserIds.push(row.id)
  return row
}

describe('submit', () => {
  it('creates a pending registration with the given fields', async () => {
    world = await createTestSchool()

    const row = await submit(
      { db: world.schoolDb },
      {
        firstName: 'Anjali',
        lastName: 'Rao',
        yearOfBirth: 2005,
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
      { firstName: 'Anjali', lastName: 'Rao', yearOfBirth: 2005, phone: '+15551234567' },
    )

    expect(row.spokenLanguages).toEqual([])
    expect(row.readLanguages).toEqual([])
    expect(row.parentNames).toEqual([])
    expect(row.email).toBeNull()
    expect(row.yearOfBirth).toBe(2005)
  })

  it('derives countryTimeZone from city/state/country rather than accepting it directly', async () => {
    world = await createTestSchool()

    const row = await submit(
      { db: world.schoolDb },
      {
        firstName: 'Anjali',
        lastName: 'Rao',
        yearOfBirth: 2005,
        phone: '+15556660099',
        city: 'Hyderabad',
        state: 'TG',
        country: 'IN',
      },
    )

    expect(row.countryTimeZone).toBe('Asia/Kolkata')
  })

  it('leaves countryTimeZone null when no country was given', async () => {
    world = await createTestSchool()

    const row = await submit(
      { db: world.schoolDb },
      { firstName: 'Anjali', lastName: 'Rao', yearOfBirth: 2005, phone: '+15556660098' },
    )

    expect(row.countryTimeZone).toBeNull()
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
    const pending = await createRegistration(world, { phone: '+15556660001' })

    const row = await approve({ db: world.schoolDb, school: { id: world.orgId } }, pending.id, reviewer.id)
    await trackProvisionedUser(world, '+15556660001')

    expect(row.status).toBe('approved')
    expect(row.reviewedBy).toBe(reviewer.id)
    expect(row.reviewedAt).not.toBeNull()
  })

  it('provisions a user, school membership, and profile, and links convertedProfileId', async () => {
    world = await createTestSchool()
    const pending = await createRegistration(world, {
      firstName: 'Anjali',
      lastName: 'Rao',
      phone: '+15556660002',
      email: 'anjali@example.com',
      learningGoal: 'Fluency',
    })

    const row = await approve({ db: world.schoolDb, school: { id: world.orgId } }, pending.id, null)
    const provisionedUser = await trackProvisionedUser(world, '+15556660002')

    expect(row.convertedProfileId).not.toBeNull()

    const profileRow = await world.schoolDb.query.profile.findFirst({
      where: (t, { eq }) => eq(t.id, row.convertedProfileId!),
    })
    // `profile` becomes the living record of the full application, not just name/phone/city — see
    // `registrations/service.ts::provisionApprovedApplicant`'s doc comment.
    expect(profileRow).toMatchObject({
      userId: provisionedUser.id,
      name: 'Anjali Rao',
      phone: '+15556660002',
      email: 'anjali@example.com',
      learningGoal: 'Fluency',
    })

    const memberRow = await publicDb.query.member.findFirst({
      where: (t, { and, eq }) => and(eq(t.organizationId, world!.orgId), eq(t.userId, provisionedUser.id)),
    })
    expect(memberRow).toMatchObject({ role: 'member' })
  })

  it('copies state, country, and the derived countryTimeZone onto the provisioned profile', async () => {
    world = await createTestSchool()
    const pending = await submit(
      { db: world.schoolDb },
      {
        firstName: 'Anjali',
        lastName: 'Rao',
        yearOfBirth: 2005,
        phone: '+15556660097',
        city: 'Hyderabad',
        state: 'TG',
        country: 'IN',
      },
    )

    const row = await approve({ db: world.schoolDb, school: { id: world.orgId } }, pending.id, null)
    await trackProvisionedUser(world, '+15556660097')

    const profileRow = await world.schoolDb.query.profile.findFirst({
      where: (t, { eq }) => eq(t.id, row.convertedProfileId!),
    })
    expect(profileRow).toMatchObject({
      state: 'TG',
      country: 'IN',
      countryTimeZone: 'Asia/Kolkata',
    })
  })

  it('uses a synthetic email when the registration gave none', async () => {
    world = await createTestSchool()
    const pending = await createRegistration(world, { phone: '+15556660003' })

    await approve({ db: world.schoolDb, school: { id: world.orgId } }, pending.id, null)
    const provisionedUser = await trackProvisionedUser(world, '+15556660003')

    expect(provisionedUser.email).toMatch(/@narada\.local$/)
  })

  it('reuses the existing account when a second application shares its phone number', async () => {
    world = await createTestSchool()
    const existingUser = await createUser(world, { phoneNumber: '+15556660004' })
    const pending = await createRegistration(world, { phone: '+15556660004' })

    const row = await approve({ db: world.schoolDb, school: { id: world.orgId } }, pending.id, null)

    const profileRow = await world.schoolDb.query.profile.findFirst({
      where: (t, { eq }) => eq(t.id, row.convertedProfileId!),
    })
    expect(profileRow?.userId).toBe(existingUser.id)
  })

  it('falls back to a synthetic email when the given email already belongs to another account', async () => {
    world = await createTestSchool()
    await createUser(world, { email: 'taken@example.com' })
    const pending = await createRegistration(world, { phone: '+15556660005', email: 'taken@example.com' })

    await approve({ db: world.schoolDb, school: { id: world.orgId } }, pending.id, null)
    const provisionedUser = await trackProvisionedUser(world, '+15556660005')

    expect(provisionedUser.email).not.toBe('taken@example.com')
  })

  it('rejects with 404 for a nonexistent registration', async () => {
    world = await createTestSchool()

    await expect(
      approve({ db: world.schoolDb, school: { id: world.orgId } }, crypto.randomUUID(), null),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('rejects with 409 when the registration was already reviewed', async () => {
    world = await createTestSchool()
    const alreadyApproved = await createRegistration(world, { status: 'approved' })

    await expect(
      approve({ db: world.schoolDb, school: { id: world.orgId } }, alreadyApproved.id, null),
    ).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('reject', () => {
  it('transitions a pending registration to rejected without provisioning an account', async () => {
    world = await createTestSchool()
    const pending = await createRegistration(world, { phone: '+15556660006' })

    const row = await reject({ db: world.schoolDb, school: { id: world.orgId } }, pending.id, null)

    expect(row.status).toBe('rejected')
    expect(row.reviewedAt).not.toBeNull()
    expect(row.convertedProfileId).toBeNull()
    await expect(
      publicDb.query.user.findFirst({ where: (t, { eq }) => eq(t.phoneNumber, '+15556660006') }),
    ).resolves.toBeUndefined()
  })
})
