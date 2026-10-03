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
import { changeRole, removeInstructor } from './service'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('changeRole', () => {
  it('promotes a student to TA and steps them back down, on the same row', async () => {
    world = await createTestSchool()
    const batch = await createBatch(world, await createTrack(world))
    const student = await createProfile(world)
    await enrollFixture(world, student, batch, 'student')

    await changeRole(world.schoolDb, batch.id, student.id, { role: 'ta' })
    await expect(findEnrollment(world.schoolDb, student.id, batch.id)).resolves.toEqual({
      role: 'ta',
      status: 'active',
    })

    await changeRole(world.schoolDb, batch.id, student.id, { role: 'student' })
    await expect(findEnrollment(world.schoolDb, student.id, batch.id)).resolves.toEqual({
      role: 'student',
      status: 'active',
    })
  })

  it('rejects with 422 for a teacher and 404 for someone not on the roster', async () => {
    world = await createTestSchool()
    const batch = await createBatch(world, await createTrack(world))
    const teacher = await createProfile(world)
    const stranger = await createProfile(world)
    await enrollFixture(world, teacher, batch, 'instructor')

    await expect(
      changeRole(world.schoolDb, batch.id, teacher.id, { role: 'ta' }),
    ).rejects.toMatchObject({ statusCode: 422 })
    await expect(
      changeRole(world.schoolDb, batch.id, stranger.id, { role: 'ta' }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('rejects with 404 for a student on a break', async () => {
    world = await createTestSchool()
    const batch = await createBatch(world, await createTrack(world))
    const student = await createProfile(world)
    await enrollFixture(world, student, batch, 'student', 'break')

    await expect(
      changeRole(world.schoolDb, batch.id, student.id, { role: 'ta' }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('removeInstructor', () => {
  it('removes a teacher while another remains', async () => {
    world = await createTestSchool()
    const batch = await createBatch(world, await createTrack(world))
    const first = await createProfile(world)
    const second = await createProfile(world)
    await enrollFixture(world, first, batch, 'instructor')
    await enrollFixture(world, second, batch, 'instructor')

    await removeInstructor(world.schoolDb, batch.id, first.id)

    await expect(findEnrollment(world.schoolDb, first.id, batch.id)).resolves.toBeUndefined()
    await expect(findEnrollment(world.schoolDb, second.id, batch.id)).resolves.toBeDefined()
  })

  it('refuses with 409 to remove the last teacher', async () => {
    world = await createTestSchool()
    const batch = await createBatch(world, await createTrack(world))
    const only = await createProfile(world)
    await enrollFixture(world, only, batch, 'instructor')

    await expect(removeInstructor(world.schoolDb, batch.id, only.id)).rejects.toMatchObject({
      statusCode: 409,
    })
    await expect(findEnrollment(world.schoolDb, only.id, batch.id)).resolves.toBeDefined()
  })

  it('refuses with 404 for a TA — they are stepped down, not removed', async () => {
    world = await createTestSchool()
    const batch = await createBatch(world, await createTrack(world))
    const teacher = await createProfile(world)
    const ta = await createProfile(world)
    await enrollFixture(world, teacher, batch, 'instructor')
    await enrollFixture(world, ta, batch, 'ta')

    await expect(removeInstructor(world.schoolDb, batch.id, ta.id)).rejects.toMatchObject({
      statusCode: 404,
    })
    await expect(findEnrollment(world.schoolDb, ta.id, batch.id)).resolves.toBeDefined()
  })
})
