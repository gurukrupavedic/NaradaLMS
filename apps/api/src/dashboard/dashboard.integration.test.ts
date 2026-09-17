import { afterEach, describe, expect, it } from 'vitest'

import { destroyTestWorld } from '../testing/cleanup'
import {
  createBatch,
  createChapter,
  createEvaluation,
  createExam,
  createProfile,
  createTestSchool,
  createTrack,
  createTrackCertification,
  enroll,
  type TestWorld,
} from '../testing/fixtures'
import { getDashboardData } from './service'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('getDashboardData (real Postgres, end to end)', () => {
  it('assembles memberships, tracks, own evaluations/exams, teaching summary, and past batches for taught students', async () => {
    world = await createTestSchool()

    // Content: two tracks, one chapter each (published, so they show under the dashboard's
    // hardcoded learnerPreview tracks view).
    const trackLearning = await createTrack(world)
    const chapterLearning = await createChapter(world, trackLearning, { status: 'published' })
    const trackTeaching = await createTrack(world)
    const chapterTeaching = await createChapter(world, trackTeaching, { status: 'published' })

    // "me": a student in one batch, an instructor in another.
    const me = await createProfile(world, { name: 'Ada Lovelace' })
    const studentBatch = await createBatch(world, trackLearning)
    await enroll(world, me, studentBatch, 'student')

    const teachingBatch = await createBatch(world, trackTeaching)
    await enroll(world, me, teachingBatch, 'instructor')
    const taughtStudent = await createProfile(world, { name: 'Taught Student' })
    await enroll(world, taughtStudent, teachingBatch, 'student')

    // My own evaluation + upcoming exam, as a student.
    const myEvaluator = await createProfile(world, { name: 'Evaluator' })
    await createEvaluation(world, { student: me, chapter: chapterLearning, evaluator: myEvaluator })
    await createExam(world, { student: me, chapter: chapterLearning, status: 'scheduled' })

    // My own certification for the learning track — decoupled from any chapter (the real gap:
    // this used to be a fake chapter row with an evaluation against it).
    await createTrackCertification(world, { track: trackLearning, student: me, evaluator: myEvaluator })

    // An evaluation I gave my taught student — should show up under `teaching`.
    await createEvaluation(world, {
      student: taughtStudent,
      chapter: chapterTeaching,
      evaluator: me,
    })

    // A past batch for the taught student, on an unrelated track — should show up under
    // `pastBatchesByStudent`, independent of the teaching batch itself.
    const pastTrack = await createTrack(world)
    const pastBatch = await createBatch(world, pastTrack)
    await enroll(world, taughtStudent, pastBatch, 'student')

    const data = await getDashboardData({ db: world.schoolDb }, me.id, me.name)

    expect(data.firstName).toBe('Ada')
    expect(data.memberships.map(m => m.id).sort()).toEqual(
      [studentBatch.id, teachingBatch.id].sort(),
    )
    expect(data.tracks.map(t => t.id).sort()).toEqual([trackLearning.id, trackTeaching.id, pastTrack.id].sort())

    expect(data.studentEvaluations).toHaveLength(1)
    expect(data.studentEvaluations[0]?.chapterId).toBe(chapterLearning.id)

    expect(data.certifications).toHaveLength(1)
    expect(data.certifications[0]?.trackId).toBe(trackLearning.id)

    expect(data.upcomingExams).toHaveLength(1)
    expect(data.upcomingExams[0]?.chapter.id).toBe(chapterLearning.id)

    expect(data.teaching).toHaveLength(1)
    expect(data.teaching[0]?.batchId).toBe(teachingBatch.id)
    expect(data.teaching[0]?.evaluations).toHaveLength(1)
    expect(data.teaching[0]?.evaluations[0]?.studentId).toBe(taughtStudent.id)

    expect(data.pastBatchesByStudent).toHaveLength(1)
    expect(data.pastBatchesByStudent[0]?.studentId).toBe(taughtStudent.id)
    expect(data.pastBatchesByStudent[0]?.batches.map(b => b.id).sort()).toEqual(
      [teachingBatch.id, pastBatch.id].sort(),
    )
  })

  it('a profile with no batches, evaluations, or exams gets a well-formed empty dashboard, not an error', async () => {
    world = await createTestSchool()
    const lonely = await createProfile(world, { name: 'Lonely Person' })

    const data = await getDashboardData({ db: world.schoolDb }, lonely.id, lonely.name)

    expect(data).toEqual({
      firstName: 'Lonely',
      memberships: [],
      tracks: [],
      studentEvaluations: [],
      certifications: [],
      upcomingExams: [],
      teaching: [],
      pastBatchesByStudent: [],
      pendingBatchIds: [],
    })
  })

  it('two batches on different tracks bucket teaching evaluations correctly, never crossing over', async () => {
    world = await createTestSchool()
    const trackA = await createTrack(world)
    const chapterA = await createChapter(world, trackA, { status: 'published' })
    const trackB = await createTrack(world)
    const chapterB = await createChapter(world, trackB, { status: 'published' })

    const me = await createProfile(world, { name: 'Teacher' })
    const batchA = await createBatch(world, trackA)
    const batchB = await createBatch(world, trackB)
    await enroll(world, me, batchA, 'instructor')
    await enroll(world, me, batchB, 'ta')

    const studentA = await createProfile(world, { name: 'Student A' })
    const studentB = await createProfile(world, { name: 'Student B' })
    await enroll(world, studentA, batchA, 'student')
    await enroll(world, studentB, batchB, 'student')

    await createEvaluation(world, { student: studentA, chapter: chapterA, evaluator: me })
    await createEvaluation(world, { student: studentB, chapter: chapterB, evaluator: me })

    const data = await getDashboardData({ db: world.schoolDb }, me.id, me.name)

    const teachingA = data.teaching.find(t => t.batchId === batchA.id)
    const teachingB = data.teaching.find(t => t.batchId === batchB.id)
    expect(teachingA?.evaluations.map(e => e.studentId)).toEqual([studentA.id])
    expect(teachingB?.evaluations.map(e => e.studentId)).toEqual([studentB.id])
  })
})
