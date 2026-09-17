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
import { putOnBreak } from './service'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

async function findRow(world: TestWorld, profileId: string, batchId: string) {
  return world.schoolDb.query.enrollment.findFirst({
    where: (t, { and, eq }) => and(eq(t.profileId, profileId), eq(t.batchId, batchId)),
  })
}

describe('putOnBreak', () => {
  it("flips the enrollment's status to break without deleting the row", async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track)
    const student = await createProfile(world)
    await enrollFixture(world, student, batch, 'student')

    await putOnBreak(world.schoolDb, batch.id, student.id)

    await expect(findRow(world, student.id, batch.id)).resolves.toMatchObject({
      profileId: student.id,
      batchId: batch.id,
      role: 'student',
      status: 'break',
    })
  })

  it('rejects with 404 when there is no such enrollment', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track)
    const student = await createProfile(world)

    await expect(putOnBreak(world.schoolDb, batch.id, student.id)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it("only updates the targeted (batchId, profileId) pair, not the profile's other enrollments", async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batchA = await createBatch(world, track)
    const batchB = await createBatch(world, track)
    const student = await createProfile(world)
    await enrollFixture(world, student, batchA, 'student')
    await enrollFixture(world, student, batchB, 'student')

    await putOnBreak(world.schoolDb, batchA.id, student.id)

    await expect(findRow(world, student.id, batchA.id)).resolves.toMatchObject({ status: 'break' })
    await expect(findRow(world, student.id, batchB.id)).resolves.toMatchObject({ status: 'active' })
  })
})
