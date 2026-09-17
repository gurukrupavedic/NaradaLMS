import { afterEach, describe, expect, it } from 'vitest'

import { destroyTestWorld } from '../testing/cleanup'
import {
  createBatch,
  createProfile,
  createTestSchool,
  createTrack,
  enroll as enrollFixture,
  type TestWorld,
} from '../testing/fixtures'
import { findEnrollment } from './repository'
import { moveEnrollment } from './service'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('moveEnrollment', () => {
  it('moves the profile to the destination batch, preserving their role', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const fromBatch = await createBatch(world, track)
    const toBatch = await createBatch(world, track)
    const instructor = await createProfile(world)
    await enrollFixture(world, instructor, fromBatch, 'instructor')

    const row = await moveEnrollment(world.schoolDb, fromBatch.id, toBatch.id, instructor.id)

    expect(row).toMatchObject({ profileId: instructor.id, batchId: toBatch.id, role: 'instructor' })
    await expect(findEnrollment(world.schoolDb, instructor.id, fromBatch.id)).resolves.toBeUndefined()
    await expect(findEnrollment(world.schoolDb, instructor.id, toBatch.id)).resolves.toEqual({
      role: 'instructor',
      status: 'active',
    })
  })

  it('rejects with 404 when the profile is not enrolled in the source batch', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const fromBatch = await createBatch(world, track)
    const toBatch = await createBatch(world, track)
    const student = await createProfile(world)

    await expect(
      moveEnrollment(world.schoolDb, fromBatch.id, toBatch.id, student.id),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('rejects with 409, leaving the original enrollment intact, when already enrolled in the destination batch', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const fromBatch = await createBatch(world, track)
    const toBatch = await createBatch(world, track)
    const student = await createProfile(world)
    await enrollFixture(world, student, fromBatch, 'student')
    await enrollFixture(world, student, toBatch, 'student')

    await expect(
      moveEnrollment(world.schoolDb, fromBatch.id, toBatch.id, student.id),
    ).rejects.toMatchObject({ statusCode: 409 })
    await expect(findEnrollment(world.schoolDb, student.id, fromBatch.id)).resolves.toEqual({
      role: 'student',
      status: 'active',
    })
  })
})
