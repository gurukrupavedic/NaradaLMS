import type { Request, Response } from 'express'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'

import { env } from '@narada/env'

import { AppError } from '../error'
import { schoolRoute } from '../naradaRoute'
import { createServer } from '../server'
import { destroyTestWorld } from '../testing/cleanup'
import {
  createBatch,
  createChapter,
  createCourse,
  createEnrollmentRequest,
  createEvaluation,
  createExam,
  createExamResult,
  createProfile,
  createRegistration,
  createTestSchool,
  createTrack,
  enroll,
  type TestWorld,
} from '../testing/fixtures'
import {
  findAccessible,
  findAccessibleWithDetail,
  findAllForProfiles,
  findAllMembershipsWithDetail,
  findOpen,
} from '../batches/repository'
import { getDashboardData } from '../dashboard/service'
import { findAll as findEnrollmentRequests } from '../enrollmentRequests/repository'
import { findAllForStudent } from '../evaluations/repository'
import { findMany as findExams } from '../exams/repository'
import { findAll as findRegistrations } from '../registrations/repository'
import { findAll as findTracks } from '../tracks/repository'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

/** Two courses, each with a track, a chapter, a batch and one student enrolled in both — enough to tell "this course's" from "the other's" in every read. */
async function seedTwoCourses() {
  const w = await createTestSchool()
  const vedam = await createCourse(w, { slug: 'vedam', name: 'Vedam' })
  const smartam = await createCourse(w, { slug: 'smartam', name: 'Smartam' })
  const vedamTrack = await createTrack(w, { course: vedam })
  const smartamTrack = await createTrack(w, { course: smartam })
  const vedamChapter = await createChapter(w, vedamTrack, { status: 'published' })
  const smartamChapter = await createChapter(w, smartamTrack, { status: 'published' })
  const vedamBatch = await createBatch(w, vedamTrack)
  const smartamBatch = await createBatch(w, smartamTrack)
  const student = await createProfile(w, { name: 'Student', yearOfBirth: 1990 })
  const evaluator = await createProfile(w, { name: 'Evaluator' })
  await enroll(w, student, vedamBatch, 'student')
  await enroll(w, student, smartamBatch, 'student')
  return {
    w,
    vedam,
    smartam,
    vedamTrack,
    smartamTrack,
    vedamChapter,
    smartamChapter,
    vedamBatch,
    smartamBatch,
    student,
    evaluator,
  }
}

const ids = (rows: { id: string }[]) => rows.map(r => r.id).sort()

// -- The request header ----------------------------------------------------------------------

function stubRequest(headers: Record<string, string | undefined>): Request {
  return { get: (name: string) => headers[name.toLowerCase()], headers } as unknown as Request
}

/** Runs `schoolRoute`'s handler for a request carrying `courseHeader` and returns what `getCourse()` gives it. */
async function courseFor(w: TestWorld, courseHeader: string | undefined) {
  let result: unknown
  const handler = schoolRoute(async ({ getCourse }) => {
    result = await getCourse()
  })
  await handler(
    stubRequest({ 'x-school-slug': `test-${w.orgId}`, 'x-course-slug': courseHeader }),
    {} as Response,
    () => {},
  )
  return result as { id: string; slug: string } | undefined
}

describe('the x-course-slug request header', () => {
  it('is no course at all when the request names none, so the read stays school-wide', async () => {
    const s = await seedTwoCourses()
    world = s.w

    await expect(courseFor(world, undefined)).resolves.toBeUndefined()
  })

  it('finds the named course, whatever the hostname’s casing', async () => {
    const s = await seedTwoCourses()
    world = s.w

    await expect(courseFor(world, 'smartam')).resolves.toMatchObject({ id: s.smartam.id })
    await expect(courseFor(world, 'SMARTAM')).resolves.toMatchObject({ id: s.smartam.id })
  })

  it('is a 404 for a course that does not exist, so a mistyped subdomain fails loudly', async () => {
    const s = await seedTwoCourses()
    world = s.w

    const error = await courseFor(world, 'nope').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({ statusCode: 404, message: 'course not found' })
  })

  it('is looked up at most once per request, and not at all if the handler never asks', async () => {
    const s = await seedTwoCourses()
    world = s.w

    let first: unknown
    let second: unknown
    const handler = schoolRoute(async ({ getCourse }) => {
      first = getCourse()
      second = getCourse()
    })
    await handler(
      stubRequest({ 'x-school-slug': `test-${world.orgId}`, 'x-course-slug': 'vedam' }),
      {} as Response,
      () => {},
    )
    expect(first).toBe(second)

    // A mistyped slug does not break a handler that never reads the course.
    const untouched = schoolRoute(async () => {})
    await expect(
      untouched(
        stubRequest({ 'x-school-slug': `test-${world.orgId}`, 'x-course-slug': 'nope' }),
        {} as Response,
        () => {},
      ),
    ).resolves.toBeUndefined()
  })
})

// -- Reads, one at a time ---------------------------------------------------------------------

describe('reads limited to a course', () => {
  it('tracks', async () => {
    const s = await seedTwoCourses()
    world = s.w

    const both = await findTracks(world.schoolDb, { kind: 'authoring' })
    const vedamOnly = await findTracks(world.schoolDb, { kind: 'authoring' }, s.vedam.id)

    expect(ids(both)).toEqual(ids([s.vedamTrack, s.smartamTrack]))
    expect(ids(vedamOnly)).toEqual([s.vedamTrack.id])
  })

  it('batch lists, in every shape', async () => {
    const s = await seedTwoCourses()
    world = s.w
    const page = { limit: 50, status: undefined, cursor: undefined }

    expect(ids((await findAccessible(world.schoolDb, page, { kind: 'all' })).items)).toEqual(
      ids([s.vedamBatch, s.smartamBatch]),
    )
    expect(
      ids((await findAccessible(world.schoolDb, page, { kind: 'all' }, s.smartam.id)).items),
    ).toEqual([s.smartamBatch.id])
    expect(
      ids(
        (
          await findAccessibleWithDetail(
            world.schoolDb,
            page,
            { kind: 'enrolled', profileId: s.student.id },
            s.student.id,
            s.vedam.id,
          )
        ).items,
      ),
    ).toEqual([s.vedamBatch.id])
    expect(ids(await findOpen(world.schoolDb))).toEqual(ids([s.vedamBatch, s.smartamBatch]))
    expect(ids(await findOpen(world.schoolDb, s.vedam.id))).toEqual([s.vedamBatch.id])
    expect(
      ids(await findAllMembershipsWithDetail(world.schoolDb, s.student.id, s.smartam.id)),
    ).toEqual([s.smartamBatch.id])
  })

  it('the batches a set of profiles have been in', async () => {
    const s = await seedTwoCourses()
    world = s.w

    const all = await findAllForProfiles(world.schoolDb, [s.student.id])
    const smartamOnly = await findAllForProfiles(world.schoolDb, [s.student.id], s.smartam.id)

    expect(all.get(s.student.id)).toHaveLength(2)
    expect(smartamOnly.get(s.student.id)?.map(b => b.id)).toEqual([s.smartamBatch.id])
  })

  it('a student’s marks, through their chapters’ tracks', async () => {
    const s = await seedTwoCourses()
    world = s.w
    await createEvaluation(world, {
      student: s.student,
      chapter: s.vedamChapter,
      evaluator: s.evaluator,
    })
    await createEvaluation(world, {
      student: s.student,
      chapter: s.smartamChapter,
      evaluator: s.evaluator,
    })

    expect(await findAllForStudent(world.schoolDb, s.student.id)).toHaveLength(2)
    const vedamMarks = await findAllForStudent(world.schoolDb, s.student.id, s.vedam.id)
    expect(vedamMarks.map(e => e.chapterId)).toEqual([s.vedamChapter.id])
  })

  it('exams, through their tracks', async () => {
    const s = await seedTwoCourses()
    world = s.w
    const vedamExam = await createExam(world, {
      student: s.student,
      track: s.vedamTrack,
      batch: s.vedamBatch,
    })
    await createExam(world, { student: s.student, track: s.smartamTrack, batch: s.smartamBatch })
    const page = { limit: 50, status: undefined, cursor: undefined }

    expect((await findExams(world.schoolDb, page, { kind: 'all' })).items).toHaveLength(2)
    const scoped = await findExams(world.schoolDb, page, { kind: 'all' }, s.vedam.id)
    expect(ids(scoped.items)).toEqual([vedamExam.id])
  })

  it('enrollment requests, through the batch they ask to join', async () => {
    const s = await seedTwoCourses()
    world = s.w
    const asker = await createProfile(world)
    const toVedam = await createEnrollmentRequest(world, asker, s.vedamBatch)
    await createEnrollmentRequest(world, asker, s.smartamBatch)
    const page = { limit: 50, status: undefined, cursor: undefined }

    expect((await findEnrollmentRequests(world.schoolDb, page, null)).items).toHaveLength(2)
    const scoped = await findEnrollmentRequests(world.schoolDb, page, null, s.vedam.id)
    expect(ids(scoped.items)).toEqual([toVedam.id])
  })

  it('registrations', async () => {
    const s = await seedTwoCourses()
    world = s.w
    const forSmartam = await createRegistration(world, { course: s.smartam })
    await createRegistration(world, { course: s.vedam })
    const page = { limit: 50, status: undefined, cursor: undefined }

    expect((await findRegistrations(world.schoolDb, page)).items).toHaveLength(2)
    const scoped = await findRegistrations(world.schoolDb, page, s.smartam.id)
    expect(ids(scoped.items)).toEqual([forSmartam.id])
  })
})

// -- The dashboard, which assembles all of them --------------------------------------------------

describe('a student’s dashboard on each course’s address', () => {
  it('shows only that course, while the school-wide view still shows both', async () => {
    const s = await seedTwoCourses()
    world = s.w
    await createEvaluation(world, {
      student: s.student,
      chapter: s.vedamChapter,
      evaluator: s.evaluator,
    })
    await createEvaluation(world, {
      student: s.student,
      chapter: s.smartamChapter,
      evaluator: s.evaluator,
    })
    const sat = await createExam(world, {
      student: s.student,
      track: s.smartamTrack,
      batch: s.smartamBatch,
      status: 'completed',
    })
    await createExamResult(world, { exam: sat, evaluator: s.evaluator })
    await createExam(world, { student: s.student, track: s.vedamTrack, batch: s.vedamBatch })
    await createEnrollmentRequest(world, s.student, s.vedamBatch)

    const both = await getDashboardData({ db: world.schoolDb }, s.student.id, s.student.name)
    const onVedam = await getDashboardData(
      { db: world.schoolDb },
      s.student.id,
      s.student.name,
      s.vedam.id,
    )
    const onSmartam = await getDashboardData(
      { db: world.schoolDb },
      s.student.id,
      s.student.name,
      s.smartam.id,
    )

    expect(both.memberships).toHaveLength(2)
    expect(both.tracks).toHaveLength(2)

    expect(ids(onVedam.memberships)).toEqual([s.vedamBatch.id])
    expect(ids(onVedam.tracks)).toEqual([s.vedamTrack.id])
    expect(onVedam.studentEvaluations.map(e => e.chapterId)).toEqual([s.vedamChapter.id])
    expect(onVedam.examResults).toEqual([])
    expect(onVedam.upcomingExams.map(e => e.track.id)).toEqual([s.vedamTrack.id])
    expect(onVedam.pendingBatchIds).toEqual([s.vedamBatch.id])

    expect(ids(onSmartam.memberships)).toEqual([s.smartamBatch.id])
    expect(ids(onSmartam.tracks)).toEqual([s.smartamTrack.id])
    expect(onSmartam.studentEvaluations.map(e => e.chapterId)).toEqual([s.smartamChapter.id])
    expect(onSmartam.examResults.map(r => r.trackId)).toEqual([s.smartamTrack.id])
    expect(onSmartam.upcomingExams).toEqual([])
    expect(onSmartam.pendingBatchIds).toEqual([])
  })
})

// -- GET /v1/courses, over real HTTP -----------------------------------------------------------------

describe('GET /v1/courses', () => {
  it('lists the school’s courses, with no session needed', async () => {
    const s = await seedTwoCourses()
    world = s.w

    const response = await request(createServer())
      .get(`/v${env.API_VERSION}/courses`)
      .set('x-school-slug', `test-${world.orgId}`)

    expect(response.status).toBe(200)
    expect(response.body.data.items).toEqual([
      { id: s.smartam.id, slug: 'smartam', name: 'Smartam' },
      { id: s.vedam.id, slug: 'vedam', name: 'Vedam' },
    ])
  })

  it('needs a school, like every school-scoped route', async () => {
    const response = await request(createServer()).get(`/v${env.API_VERSION}/courses`)

    expect(response.status).toBe(400)
  })
})
