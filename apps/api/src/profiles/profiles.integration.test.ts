import { afterEach, describe, expect, it } from 'vitest'

import type { User } from '../session'
import { AccessPolicy } from '../utils/accessPolicy'
import { getDashboardData } from '../dashboard/service'
import { destroyTestWorld } from '../testing/cleanup'
import * as enrollmentRepository from '../enrollment/repository'
import {
  createBatch,
  createChapter,
  createEvaluation,
  createMembership,
  createProfile,
  createTestSchool,
  createTrack,
  createUser,
  enroll,
  type TestWorld,
} from '../testing/fixtures'
import * as repository from './repository'
import { findById, updateProfile } from './service'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('profile deactivation (matrix items 3 & 4, updated for DD-011 pure soft-delete)', () => {
  it('soft-deletes a profile: deletedAt set, every other column retained unchanged', async () => {
    world = await createTestSchool()
    const profileRow = await createProfile(world, {
      userId: 'user-no-refs',
      phone: '555-0100',
      city: 'Springfield',
    })

    const result = await repository.softDeleteOwned(world.schoolDb, profileRow.id, 'user-no-refs')
    expect(result).toHaveLength(1)

    const found = await world.schoolDb.query.profile.findFirst({
      where: (t, { eq }) => eq(t.id, profileRow.id),
    })
    expect(found).toBeDefined()
    expect(found?.deletedAt).not.toBeNull()
    // Pure soft-delete (DD-011, revised): phone/city are NOT critical PII for this product and
    // are retained, not cleared.
    expect(found?.phone).toBe('555-0100')
    expect(found?.city).toBe('Springfield')
    expect(found?.name).toBe(profileRow.name)
  })

  it(
    'soft-deletes a profile referenced by evaluation.evaluatorId — DD-011 lifted the old ' +
      "restrict-FK block (evaluation.evaluatorId's onDelete: 'restrict' is never hit since " +
      'this is an UPDATE, not a physical DELETE)',
    async () => {
      world = await createTestSchool()
      const trackRow = await createTrack(world)
      const chapterRow = await createChapter(world, trackRow)
      const studentProfile = await createProfile(world)
      const evaluatorProfile = await createProfile(world, { userId: 'evaluator-user' })

      await createEvaluation(world, {
        student: studentProfile,
        chapter: chapterRow,
        evaluator: evaluatorProfile,
      })

      const result = await repository.softDeleteOwned(
        world.schoolDb,
        evaluatorProfile.id,
        'evaluator-user',
      )
      expect(result).toHaveLength(1)

      const stillThere = await world.schoolDb.query.profile.findFirst({
        where: (t, { eq }) => eq(t.id, evaluatorProfile.id),
      })
      expect(stillThere).toBeDefined()
      expect(stillThere?.deletedAt).not.toBeNull()
    },
  )

  it('a repeat soft-delete matches zero rows (idempotent-safe, no re-touching)', async () => {
    world = await createTestSchool()
    const profileRow = await createProfile(world, { userId: 'user-repeat' })

    const first = await repository.softDeleteOwned(world.schoolDb, profileRow.id, 'user-repeat')
    expect(first).toHaveLength(1)

    const second = await repository.softDeleteOwned(world.schoolDb, profileRow.id, 'user-repeat')
    expect(second).toHaveLength(0)
  })

  it('enrollment rows survive deactivation unchanged — "which batches was this user in" keeps working', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const profileRow = await createProfile(world, { userId: 'user-with-enrollment' })
    const batchRow = await createBatch(world, trackRow)
    await enroll(world, profileRow, batchRow, 'student')

    await repository.softDeleteOwned(world.schoolDb, profileRow.id, 'user-with-enrollment')

    const stillEnrolled = await world.schoolDb.query.enrollment.findFirst({
      where: (t, { eq }) => eq(t.profileId, profileRow.id),
    })
    expect(stillEnrolled).toBeDefined()
    expect(stillEnrolled?.batchId).toBe(batchRow.id)
  })

  it(
    'a deactivated student can no longer be the target of a NEW exam, even though their ' +
      'enrollment row still exists (DD-011 §4.6 gap fix)',
    async () => {
      world = await createTestSchool()
      const trackRow = await createTrack(world)
      const studentProfile = await createProfile(world, { userId: 'user-deactivated-student' })
      const batchRow = await createBatch(world, trackRow)
      await enroll(world, studentProfile, batchRow, 'student')

      await repository.softDeleteOwned(
        world.schoolDb,
        studentProfile.id,
        'user-deactivated-student',
      )

      // The enrollment row is still there...
      const stillEnrolled = await world.schoolDb.query.enrollment.findFirst({
        where: (t, { eq }) => eq(t.profileId, studentProfile.id),
      })
      expect(stillEnrolled).toBeDefined()

      // ...but it must no longer qualify the (now-deactivated) student for a new exam.
      const qualifying = await enrollmentRepository.findQualifyingBatches(
        world.schoolDb,
        studentProfile.id,
        trackRow.id,
      )
      expect(qualifying).toHaveLength(0)
    },
  )
})

describe('updateProfile (student self-edit) — countryTimeZone re-derivation', () => {
  function actor(userId: string): User {
    return { id: userId, isSuperAdmin: false } as User
  }

  it('derives countryTimeZone from the patch, merged onto the existing city, when state/country change but city does not', async () => {
    world = await createTestSchool()
    const profileRow = await createProfile(world, { userId: 'user-tz-1', city: 'Cambridge' })
    const orgSchool = { id: world.orgId } as unknown as Parameters<
      typeof updateProfile
    >[0]['school']
    const context = { db: world.schoolDb, school: orgSchool, user: actor('user-tz-1') }

    const updated = await updateProfile(context, profileRow.id, { state: 'MA', country: 'US' })

    expect(updated.countryTimeZone).toBe('America/New_York')
    expect(updated.city).toBe('Cambridge')
  })

  it('leaves a previously derived countryTimeZone untouched when the patch touches neither city, state, nor country', async () => {
    world = await createTestSchool()
    const profileRow = await createProfile(world, { userId: 'user-tz-2', city: 'Cambridge' })
    const orgSchool = { id: world.orgId } as unknown as Parameters<
      typeof updateProfile
    >[0]['school']
    const context = { db: world.schoolDb, school: orgSchool, user: actor('user-tz-2') }

    await updateProfile(context, profileRow.id, { state: 'MA', country: 'US' })
    const updated = await updateProfile(context, profileRow.id, { name: 'Renamed' })

    expect(updated.name).toBe('Renamed')
    expect(updated.countryTimeZone).toBe('America/New_York')
  })

  it('re-derives from scratch when city changes but state/country do not', async () => {
    world = await createTestSchool()
    const profileRow = await createProfile(world, { userId: 'user-tz-3', city: 'Cambridge' })
    const orgSchool = { id: world.orgId } as unknown as Parameters<
      typeof updateProfile
    >[0]['school']
    const context = { db: world.schoolDb, school: orgSchool, user: actor('user-tz-3') }

    await updateProfile(context, profileRow.id, { state: 'TG', country: 'IN' })
    const updated = await updateProfile(context, profileRow.id, { city: 'Hyderabad' })

    expect(updated.countryTimeZone).toBe('Asia/Kolkata')
  })
})

describe('admin-deactivation (DD-011 §9)', () => {
  it('deactivates a profile with no ownership check — every other column, and its enrollment history, survive unchanged', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const profileRow = await createProfile(world, {
      userId: 'user-admin-target',
      phone: '555-0199',
      city: 'Metropolis',
    })
    const batchRow = await createBatch(world, trackRow)
    await enroll(world, profileRow, batchRow, 'student')

    const result = await repository.softDeleteById(world.schoolDb, profileRow.id)
    expect(result).toHaveLength(1)

    const found = await world.schoolDb.query.profile.findFirst({
      where: (t, { eq }) => eq(t.id, profileRow.id),
    })
    expect(found?.deletedAt).not.toBeNull()
    expect(found?.phone).toBe('555-0199')
    expect(found?.city).toBe('Metropolis')

    const stillEnrolled = await world.schoolDb.query.enrollment.findFirst({
      where: (t, { eq }) => eq(t.profileId, profileRow.id),
    })
    expect(stillEnrolled).toBeDefined()
  })

  it('a repeat admin-deactivation matches zero rows (idempotent-safe, same contract as owner soft-delete)', async () => {
    world = await createTestSchool()
    const profileRow = await createProfile(world, { userId: 'user-admin-target-2' })

    const first = await repository.softDeleteById(world.schoolDb, profileRow.id)
    expect(first).toHaveLength(1)

    const second = await repository.softDeleteById(world.schoolDb, profileRow.id)
    expect(second).toHaveLength(0)
  })

  it('a nonexistent profile id matches zero rows', async () => {
    world = await createTestSchool()

    const result = await repository.softDeleteById(world.schoolDb, crypto.randomUUID())
    expect(result).toHaveLength(0)
  })
})

describe('search (admin "enroll a student" support)', () => {
  it('matches by case-insensitive substring and orders by name', async () => {
    world = await createTestSchool()
    await createProfile(world, { name: 'Bea Baker' })
    await createProfile(world, { name: 'Ada Anderson' })
    await createProfile(world, { name: 'Zed Zephyr' })

    const results = await repository.search(world.schoolDb, { query: 'a' }, { kind: 'all' })

    expect(results.map(r => r.name)).toEqual(['Ada Anderson', 'Bea Baker'])
  })

  it('matches every word of a multi-word query regardless of order', async () => {
    world = await createTestSchool()
    const match = await createProfile(world, { name: 'Ravi Kumar' })
    await createProfile(world, { name: 'Someone Else' })

    // "kumar ravi" is not a substring of "Ravi Kumar" — a plain `ilike` over the full query would
    // miss this even though every word the reader typed is right there.
    const results = await repository.search(
      world.schoolDb,
      { query: 'kumar ravi' },
      { kind: 'all' },
    )

    expect(results.map(r => r.id)).toEqual([match.id])
  })

  it('excludes profiles already enrolled in excludeBatchId', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    const enrolledProfile = await createProfile(world, { name: 'Already Enrolled' })
    const unenrolledProfile = await createProfile(world, { name: 'Not Yet Enrolled' })
    await enroll(world, enrolledProfile, batchRow, 'student')

    const results = await repository.search(
      world.schoolDb,
      { excludeBatchId: batchRow.id },
      { kind: 'all' },
    )

    expect(results.map(r => r.id)).toContain(unenrolledProfile.id)
    expect(results.map(r => r.id)).not.toContain(enrolledProfile.id)
  })

  it('never returns a deactivated profile', async () => {
    world = await createTestSchool()
    const deactivated = await createProfile(world, { name: 'Deactivated Person' })
    await repository.softDeleteOwned(world.schoolDb, deactivated.id, deactivated.userId)

    const results = await repository.search(
      world.schoolDb,
      { query: 'Deactivated' },
      { kind: 'all' },
    )

    expect(results).toHaveLength(0)
  })

  it('with no query and no excludeBatchId, returns every active profile up to the limit', async () => {
    world = await createTestSchool()
    await createProfile(world)
    await createProfile(world)

    const results = await repository.search(world.schoolDb, {}, { kind: 'all' })

    expect(results.length).toBeGreaterThanOrEqual(2)
  })

  it("scoped to 'enrolled', only matches profiles sharing a live batch with the scope's profileId", async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const myBatch = await createBatch(world, trackRow)
    const otherBatch = await createBatch(world, trackRow)
    const me = await createProfile(world, { name: 'Me' })
    const batchmate = await createProfile(world, { name: 'Batchmate' })
    const stranger = await createProfile(world, { name: 'Stranger' })
    await enroll(world, me, myBatch, 'student')
    await enroll(world, batchmate, myBatch, 'student')
    await enroll(world, stranger, otherBatch, 'student')

    const results = await repository.search(
      world.schoolDb,
      {},
      { kind: 'enrolled', profileId: me.id },
    )

    expect(results.map(r => r.id).sort()).toEqual([batchmate.id, me.id].sort())
    expect(results.map(r => r.id)).not.toContain(stranger.id)
  })

  it("scoped to 'enrolled' with no batches at all, matches nothing", async () => {
    world = await createTestSchool()
    const lonelyProfile = await createProfile(world, { name: 'Lonely' })
    await createProfile(world, { name: 'Someone Else' })

    const results = await repository.search(
      world.schoolDb,
      {},
      { kind: 'enrolled', profileId: lonelyProfile.id },
    )

    expect(results).toHaveLength(0)
  })
})

// The profile detail page's whole access story, end to end against a real database — the pieces
// `profiles/route.ts`'s `GET /:profileId/detail` composes: `AccessPolicy#requireCanViewProfile`
// (unit-tested against mocks in `utils/accessPolicy.test.ts`), `findById`, and the dashboard
// domain's already-parametrized `getDashboardData`.
describe('profile detail access (self, admin, shared teacher, stranger)', () => {
  function actor(userId: string): User {
    return { id: userId, isSuperAdmin: false } as User
  }

  it('a student can view their own profile', async () => {
    world = await createTestSchool()
    const userRow = await createUser(world)
    await createMembership(world, userRow.id, { role: 'member' })
    const studentProfile = await createProfile(world, { userId: userRow.id })
    const orgSchool = { id: world.orgId } as unknown as Parameters<
      typeof AccessPolicy.load
    >[0]['school']

    const access = await AccessPolicy.load({
      db: world.schoolDb,
      school: orgSchool,
      user: actor(userRow.id),
      profile: studentProfile,
    })

    await expect(access.requireCanViewProfile(studentProfile.id)).resolves.toBeUndefined()
    const detail = await findById(
      { db: world.schoolDb, school: orgSchool, user: actor(userRow.id) },
      studentProfile.id,
    )
    await expect(
      getDashboardData({ db: world.schoolDb }, detail.id, detail.name),
    ).resolves.toBeDefined()
  })

  it('a school admin can view any profile', async () => {
    world = await createTestSchool()
    const adminUserRow = await createUser(world)
    await createMembership(world, adminUserRow.id, { role: 'admin' })
    const adminProfile = await createProfile(world, { userId: adminUserRow.id })
    const studentProfile = await createProfile(world)
    const orgSchool = { id: world.orgId } as unknown as Parameters<
      typeof AccessPolicy.load
    >[0]['school']

    const access = await AccessPolicy.load({
      db: world.schoolDb,
      school: orgSchool,
      user: actor(adminUserRow.id),
      profile: adminProfile,
    })

    await expect(access.requireCanViewProfile(studentProfile.id)).resolves.toBeUndefined()
  })

  it('a teacher sharing a batch with the student can view their profile', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    const teacherUserRow = await createUser(world)
    await createMembership(world, teacherUserRow.id, { role: 'member' })
    const teacherProfile = await createProfile(world, { userId: teacherUserRow.id })
    const studentProfile = await createProfile(world)
    await enroll(world, teacherProfile, batchRow, 'instructor')
    await enroll(world, studentProfile, batchRow, 'student')
    const orgSchool = { id: world.orgId } as unknown as Parameters<
      typeof AccessPolicy.load
    >[0]['school']

    const access = await AccessPolicy.load({
      db: world.schoolDb,
      school: orgSchool,
      user: actor(teacherUserRow.id),
      profile: teacherProfile,
    })

    await expect(access.requireCanViewProfile(studentProfile.id)).resolves.toBeUndefined()
  })

  it('an unrelated member with no shared batch and no admin status is denied', async () => {
    world = await createTestSchool()
    const strangerUserRow = await createUser(world)
    await createMembership(world, strangerUserRow.id, { role: 'member' })
    const strangerProfile = await createProfile(world, { userId: strangerUserRow.id })
    const studentProfile = await createProfile(world)
    const orgSchool = { id: world.orgId } as unknown as Parameters<
      typeof AccessPolicy.load
    >[0]['school']

    const access = await AccessPolicy.load({
      db: world.schoolDb,
      school: orgSchool,
      user: actor(strangerUserRow.id),
      profile: strangerProfile,
    })

    await expect(access.requireCanViewProfile(studentProfile.id)).rejects.toMatchObject({
      statusCode: 403,
    })
  })
})
