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
import { setScores } from './service'

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

describe('setScores', () => {
  it('writes only the scores given, and stamps who set them', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track)
    const student = await createProfile(world)
    const teacher = await createProfile(world)
    await enrollFixture(world, student, batch, 'student')

    await setScores(world.schoolDb, batch.id, student.id, { attendanceScore: 1 }, teacher.id)
    await setScores(world.schoolDb, batch.id, student.id, { backlogScore: -1 }, teacher.id)

    await expect(findRow(world, student.id, batch.id)).resolves.toMatchObject({
      attendanceScore: 1,
      recitationScore: null,
      backlogScore: -1,
      scoresUpdatedBy: teacher.id,
    })
  })

  it('clears a score with null', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track)
    const student = await createProfile(world)
    const teacher = await createProfile(world)
    await enrollFixture(world, student, batch, 'student')

    await setScores(world.schoolDb, batch.id, student.id, { recitationScore: 0 }, teacher.id)
    await setScores(world.schoolDb, batch.id, student.id, { recitationScore: null }, teacher.id)

    await expect(findRow(world, student.id, batch.id)).resolves.toMatchObject({ recitationScore: null })
  })

  it('rejects with 404 for an instructor, who has no scores', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track)
    const instructor = await createProfile(world)
    await enrollFixture(world, instructor, batch, 'instructor')

    await expect(
      setScores(world.schoolDb, batch.id, instructor.id, { attendanceScore: 1 }, instructor.id),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it("only touches the targeted batch's enrollment", async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batchA = await createBatch(world, track)
    const batchB = await createBatch(world, track)
    const student = await createProfile(world)
    await enrollFixture(world, student, batchA, 'student')
    await enrollFixture(world, student, batchB, 'ta')

    await setScores(world.schoolDb, batchA.id, student.id, { attendanceScore: 1 }, student.id)

    await expect(findRow(world, student.id, batchB.id)).resolves.toMatchObject({ attendanceScore: null })
  })
})
