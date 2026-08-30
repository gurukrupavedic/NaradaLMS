import { afterEach, describe, expect, it } from 'vitest'

import { destroyTestWorld } from '../testing/cleanup'
import * as enrollmentRepository from '../enrollment/repository'
import {
  createBatch,
  createChapter,
  createEvaluation,
  createProfile,
  createTestSchool,
  createTrack,
  enroll,
  type TestWorld,
} from '../testing/fixtures'
import * as repository from './repository'

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

      await repository.softDeleteOwned(world.schoolDb, studentProfile.id, 'user-deactivated-student')

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

    const results = await repository.search(world.schoolDb, { query: 'a' })

    expect(results.map(r => r.name)).toEqual(['Ada Anderson', 'Bea Baker'])
  })

  it('excludes profiles already enrolled in excludeBatchId', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    const enrolledProfile = await createProfile(world, { name: 'Already Enrolled' })
    const unenrolledProfile = await createProfile(world, { name: 'Not Yet Enrolled' })
    await enroll(world, enrolledProfile, batchRow, 'student')

    const results = await repository.search(world.schoolDb, { excludeBatchId: batchRow.id })

    expect(results.map(r => r.id)).toContain(unenrolledProfile.id)
    expect(results.map(r => r.id)).not.toContain(enrolledProfile.id)
  })

  it('never returns a deactivated profile', async () => {
    world = await createTestSchool()
    const deactivated = await createProfile(world, { name: 'Deactivated Person' })
    await repository.softDeleteOwned(world.schoolDb, deactivated.id, deactivated.userId)

    const results = await repository.search(world.schoolDb, { query: 'Deactivated' })

    expect(results).toHaveLength(0)
  })

  it('with no query and no excludeBatchId, returns every active profile up to the limit', async () => {
    world = await createTestSchool()
    await createProfile(world)
    await createProfile(world)

    const results = await repository.search(world.schoolDb, {})

    expect(results.length).toBeGreaterThanOrEqual(2)
  })
})
