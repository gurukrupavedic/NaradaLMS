import { afterEach, describe, expect, it } from 'vitest'

import { and, eq } from 'drizzle-orm'

import { courseProfile, publicDb } from '@narada/db'

import { find as findCourseProfile } from '../courseProfile/repository'
import { destroyTestWorld } from '../testing/cleanup'
import {
  createCourse,
  createProfile,
  createRegistration,
  createTestSchool,
  createUser,
  type TestWorld,
  defaultCourseId,
} from '../testing/fixtures'
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
      { db: world.schoolDb, school: { slug: 'test' }, course: { slug: 'ved' } },
      {
        firstName: 'Anjali',
        lastName: 'Rao',
        yearOfBirth: 2005,
        phone: '+15551234567',
        spokenLanguages: ['Telugu'],
        readLanguages: [],
        parentNames: ['Parent One'],
      },
      (await createCourse(world)).id,
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
      { db: world.schoolDb, school: { slug: 'test' }, course: { slug: 'ved' } },
      { firstName: 'Anjali', lastName: 'Rao', yearOfBirth: 2005, phone: '+15551234567' },
      (await createCourse(world)).id,
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
      { db: world.schoolDb, school: { slug: 'test' }, course: { slug: 'ved' } },
      {
        firstName: 'Anjali',
        lastName: 'Rao',
        yearOfBirth: 2005,
        phone: '+15556660099',
        city: 'Hyderabad',
        state: 'TG',
        country: 'IN',
      },
      (await createCourse(world)).id,
    )

    expect(row.countryTimeZone).toBe('Asia/Kolkata')
  })

  it('leaves countryTimeZone null when no country was given', async () => {
    world = await createTestSchool()

    const row = await submit(
      { db: world.schoolDb, school: { slug: 'test' }, course: { slug: 'ved' } },
      { firstName: 'Anjali', lastName: 'Rao', yearOfBirth: 2005, phone: '+15556660098' },
      (await createCourse(world)).id,
    )

    expect(row.countryTimeZone).toBeNull()
  })

  // Only `school.slug` matters to `submit`'s details validation — the definitions come from
  // `@narada/profile-fields`, keyed by it — so the world's own (random-slugged) school is reused.
  const applicant = { firstName: 'Anjali', lastName: 'Rao', yearOfBirth: 2005, phone: '+15556660096' }

  it('stores the details a school collects, dropping any its conditions hide', async () => {
    world = await createTestSchool()

    const row = await submit(
      { db: world.schoolDb, school: { slug: 'slmts' }, course: { slug: 'ved' } },
      {
        ...applicant,
        details: { gothram: 'Bharadwaja', married: false, gothramSpouse: 'stale', gothramMother: 'Vasishta' },
      },
      (await createCourse(world)).id,
    )

    expect(row.details).toEqual({ gothram: 'Bharadwaja', married: false, gothramMother: 'Vasishta' })
  })

  it("rejects a registration missing a field its school requires", async () => {
    world = await createTestSchool()

    await expect(
      submit({ db: world.schoolDb, school: { slug: 'rr' }, course: { slug: 'ved' } }, applicant, (await createCourse(world)).id),
    ).rejects.toMatchObject({ statusCode: 400, message: 'details.gothram: is required' })
  })

  it('requires the spouse gothram once married is ticked', async () => {
    world = await createTestSchool()

    await expect(
      submit(
        { db: world.schoolDb, school: { slug: 'slmts' }, course: { slug: 'ved' } },
        { ...applicant, details: { gothram: 'A', married: true, gothramMother: 'B' } },
        (await createCourse(world)).id,
      ),
    ).rejects.toMatchObject({ statusCode: 400, message: 'details.gothramSpouse: is required' })
  })

  it('rejects a key the school does not collect, and stores {} for a school that collects nothing', async () => {
    world = await createTestSchool()
    const courseId = (await createCourse(world)).id

    await expect(
      submit({ db: world.schoolDb, school: { slug: 'rr' }, course: { slug: 'ved' } }, { ...applicant, details: { gothram: 'A', gothramMother: 'B' } }, courseId),
    ).rejects.toMatchObject({ statusCode: 400, message: 'details.gothramMother: is not a field for this school' })

    const row = await submit({ db: world.schoolDb, school: { slug: 'test' }, course: { slug: 'ved' } }, applicant, courseId)
    expect(row.details).toEqual({})
  })
})

describe('findAll', () => {
  it('filters by status', async () => {
    world = await createTestSchool()
    await createRegistration(world, { status: 'pending' })
    const approved = await createRegistration(world, { status: 'approved' })

    const result = await findAll({ db: world.schoolDb }, { status: 'approved', limit: 20 }, await defaultCourseId(world))

    expect(result.items.map(item => item.id)).toEqual([approved.id])
  })

  it('paginates newest-first with a cursor', async () => {
    world = await createTestSchool()
    const first = await createRegistration(world)
    const second = await createRegistration(world)

    const page1 = await findAll({ db: world.schoolDb }, { limit: 1 }, await defaultCourseId(world))
    expect(page1.items.map(item => item.id)).toEqual([second.id])
    expect(page1.nextCursor).not.toBeNull()

    // Following the pattern in batches.integration.test.ts: the cursor is reconstructed directly
    // from the last item's own sort key rather than decoding the opaque nextCursor string — that
    // encoding is utils/cursor.ts's own concern, already tested there.
    const page2 = await findAll(
      { db: world.schoolDb },
      { limit: 1, cursor: { createdAt: second.createdAt, id: second.id } },
      await defaultCourseId(world),
    )
    expect(page2.items.map(item => item.id)).toEqual([first.id])
  })
})

describe('approve', () => {
  it('transitions a pending registration to approved and records the reviewer', async () => {
    world = await createTestSchool()
    const reviewer = await createProfile(world)
    const pending = await createRegistration(world, { phone: '+15556660001' })

    const row = await approve({ db: world.schoolDb, school: { id: world.orgId, slug: 'test' } }, pending.id, reviewer.id)
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
      comments: 'Happy to help set up.',
      currentProficiency: 'practicing',
    })

    const row = await approve({ db: world.schoolDb, school: { id: world.orgId, slug: 'test' } }, pending.id, null)
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
    })
    // The three course-level answers went to the profile's row for the course applied to, not the
    // school-wide profile.
    const courseRow = await findCourseProfile(
      world.schoolDb,
      row.convertedProfileId!,
      pending.courseId,
    )
    expect(courseRow).toMatchObject({
      learningGoal: 'Fluency',
      currentProficiency: 'practicing',
      comments: 'Happy to help set up.',
    })

    const memberRow = await publicDb.query.member.findFirst({
      where: (t, { and, eq }) => and(eq(t.organizationId, world!.orgId), eq(t.userId, provisionedUser.id)),
    })
    expect(memberRow).toMatchObject({ role: 'member' })
  })

  it('copies state, country, and the derived countryTimeZone onto the provisioned profile', async () => {
    world = await createTestSchool()
    const pending = await submit(
      { db: world.schoolDb, school: { slug: 'test' }, course: { slug: 'ved' } },
      {
        firstName: 'Anjali',
        lastName: 'Rao',
        yearOfBirth: 2005,
        phone: '+15556660097',
        city: 'Hyderabad',
        state: 'TG',
        country: 'IN',
      },
      (await createCourse(world)).id,
    )

    const row = await approve({ db: world.schoolDb, school: { id: world.orgId, slug: 'test' } }, pending.id, null)
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

  it('sends each answer to its own level, and gives the student a row for the course applied to', async () => {
    world = await createTestSchool()
    const course = await createCourse(world, { slug: 'ved', name: 'Vedam' })
    const pending = await submit(
      { db: world.schoolDb, school: { slug: 'slmts' }, course: { slug: 'ved' } },
      {
        firstName: 'Anjali',
        lastName: 'Rao',
        yearOfBirth: 2005,
        phone: '+15556660095',
        details: { gothram: 'Bharadwaja', married: true, gothramSpouse: 'Kashyapa', gothramMother: 'Vasishta' },
      },
      course.id,
    )

    const row = await approve({ db: world.schoolDb, school: { id: world.orgId, slug: 'slmts' } }, pending.id, null)
    await trackProvisionedUser(world, '+15556660095')

    // The school's fields (gothrams) land on the profile, unchanged...
    const profileRow = await world.schoolDb.query.profile.findFirst({
      where: (t, { eq }) => eq(t.id, row.convertedProfileId!),
    })
    expect(profileRow?.details).toEqual(pending.details)

    // ...and the student now has a course-level row for the course they applied to. Vedam's own field
    // is a counter, which a registration never asks for, so it starts empty (the counter reads 0).
    const courseRows = await world.schoolDb
      .select()
      .from(courseProfile)
      .where(and(eq(courseProfile.profileId, row.convertedProfileId!), eq(courseProfile.courseId, course.id)))
    expect(courseRows.map(r => r.details)).toEqual([{}])
  })

  it('uses a synthetic email when the registration gave none', async () => {
    world = await createTestSchool()
    const pending = await createRegistration(world, { phone: '+15556660003' })

    await approve({ db: world.schoolDb, school: { id: world.orgId, slug: 'test' } }, pending.id, null)
    const provisionedUser = await trackProvisionedUser(world, '+15556660003')

    expect(provisionedUser.email).toMatch(/@narada\.local$/)
  })

  it('reuses the existing account when a second application shares its phone number', async () => {
    world = await createTestSchool()
    const existingUser = await createUser(world, { phoneNumber: '+15556660004' })
    const pending = await createRegistration(world, { phone: '+15556660004' })

    const row = await approve({ db: world.schoolDb, school: { id: world.orgId, slug: 'test' } }, pending.id, null)

    const profileRow = await world.schoolDb.query.profile.findFirst({
      where: (t, { eq }) => eq(t.id, row.convertedProfileId!),
    })
    expect(profileRow?.userId).toBe(existingUser.id)
  })

  it('falls back to a synthetic email when the given email already belongs to another account', async () => {
    world = await createTestSchool()
    await createUser(world, { email: 'taken@example.com' })
    const pending = await createRegistration(world, { phone: '+15556660005', email: 'taken@example.com' })

    await approve({ db: world.schoolDb, school: { id: world.orgId, slug: 'test' } }, pending.id, null)
    const provisionedUser = await trackProvisionedUser(world, '+15556660005')

    expect(provisionedUser.email).not.toBe('taken@example.com')
  })

  it('rejects with 404 for a nonexistent registration', async () => {
    world = await createTestSchool()

    await expect(
      approve({ db: world.schoolDb, school: { id: world.orgId, slug: 'test' } }, crypto.randomUUID(), null),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('rejects with 409 when the registration was already reviewed', async () => {
    world = await createTestSchool()
    const alreadyApproved = await createRegistration(world, { status: 'approved' })

    await expect(
      approve({ db: world.schoolDb, school: { id: world.orgId, slug: 'test' } }, alreadyApproved.id, null),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('provisions exactly one profile when the same registration is approved twice at once', async () => {
    world = await createTestSchool()
    const pending = await createRegistration(world, { phone: '+15556660010' })
    const context = { db: world.schoolDb, school: { id: world.orgId, slug: 'test' } }

    const results = await Promise.allSettled([
      approve(context, pending.id, null),
      approve(context, pending.id, null),
    ])
    await trackProvisionedUser(world, '+15556660010')

    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.find(r => r.status === 'rejected')).toMatchObject({
      reason: { statusCode: 409 },
    })
    const profiles = await world.schoolDb.query.profile.findMany({
      where: (t, { eq }) => eq(t.phone, '+15556660010'),
    })
    expect(profiles).toHaveLength(1)
  })
})

describe('reject', () => {
  it('transitions a pending registration to rejected without provisioning an account', async () => {
    world = await createTestSchool()
    const pending = await createRegistration(world, { phone: '+15556660006' })

    const row = await reject({ db: world.schoolDb, school: { id: world.orgId, slug: 'test' } }, pending.id, null)

    expect(row.status).toBe('rejected')
    expect(row.reviewedAt).not.toBeNull()
    expect(row.convertedProfileId).toBeNull()
    await expect(
      publicDb.query.user.findFirst({ where: (t, { eq }) => eq(t.phoneNumber, '+15556660006') }),
    ).resolves.toBeUndefined()
  })
})
