import { afterEach, describe, expect, it } from 'vitest'

import { destroyTestWorld } from '../testing/cleanup'
import {
  createBatch,
  createExam,
  createExamResult,
  createProfile,
  createTestSchool,
  createTrack,
  defaultCourseId,
  type TestWorld,
} from '../testing/fixtures'
import { findOpenBatches } from './service'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('findOpenBatches', () => {
  it('includes an upcoming batch', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const upcoming = await createBatch(world, track, { status: 'upcoming' })
    const student = await createProfile(world)

    const items = await findOpenBatches({ db: world.schoolDb }, await defaultCourseId(world), student.id)

    expect(items.map(item => item.id)).toEqual([upcoming.id])
  })

  it('includes an active batch', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const active = await createBatch(world, track, { status: 'active' })
    const student = await createProfile(world)

    const items = await findOpenBatches({ db: world.schoolDb }, await defaultCourseId(world), student.id)

    expect(items.map(item => item.id)).toEqual([active.id])
  })

  it('excludes a completed batch', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    await createBatch(world, track, { status: 'completed' })
    const student = await createProfile(world)

    await expect(
      findOpenBatches({ db: world.schoolDb }, await defaultCourseId(world), student.id),
    ).resolves.toEqual([])
  })

  it('marks a course\'s first track as eligible with no exam history', async () => {
    world = await createTestSchool()
    const track = await createTrack(world, { order: 1 })
    const batch = await createBatch(world, track, { status: 'upcoming' })
    const student = await createProfile(world)

    const items = await findOpenBatches({ db: world.schoolDb }, await defaultCourseId(world), student.id)

    expect(items.find(item => item.id === batch.id)?.eligible).toBe(true)
  })

  it('marks a later track ineligible until the student passes the one before it', async () => {
    world = await createTestSchool()
    const track1 = await createTrack(world, { order: 1 })
    const track2 = await createTrack(world, { order: 2 })
    const batch2 = await createBatch(world, track2, { status: 'upcoming' })
    const student = await createProfile(world)
    const evaluator = await createProfile(world, { name: 'Evaluator' })

    const before = await findOpenBatches({ db: world.schoolDb }, await defaultCourseId(world), student.id)
    expect(before.find(item => item.id === batch2.id)?.eligible).toBe(false)

    const exam = await createExam(world, { student, track: track1, status: 'completed' })
    // Marks totalling 70 (65-74 band) — a `level1` outcome, the minimum this gate requires.
    await createExamResult(world, {
      exam,
      evaluator,
      marks: { aksharaShuddhi: 35, swaraShuddhi: 20, niyantranaAnargalata: 10, shraavyata: 3, pratishakyaGrammar: 2 },
    })

    const after = await findOpenBatches({ db: world.schoolDb }, await defaultCourseId(world), student.id)
    expect(after.find(item => item.id === batch2.id)?.eligible).toBe(true)
  })
})
