import type { Request, Response } from 'express'
import request from 'supertest'
import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { registration } from '@narada/db'
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
import { findForProfile as findCoursesForProfile } from './repository'

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

describe('the course a request is about', () => {
  it('is the school’s only course when the request names none', async () => {
    world = await createTestSchool()
    const only = await createCourse(world, { slug: 'vedam' })

    await expect(courseFor(world, undefined)).resolves.toMatchObject({ id: only.id })
  })

  it('is a 422, not a guess, when the school has several courses and the request names none', async () => {
    const s = await seedTwoCourses()
    world = s.w

    const error = await courseFor(world, undefined).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({ statusCode: 422 })
  })

  it('is no course, and no error, for a brand-new school that has none yet', async () => {
    world = await createTestSchool()

    await expect(courseFor(world, undefined)).resolves.toBeUndefined()
  })

  it('finds the named course, whatever its casing', async () => {
    const s = await seedTwoCourses()
    world = s.w

    await expect(courseFor(world, 'smartam')).resolves.toMatchObject({ id: s.smartam.id })
    await expect(courseFor(world, 'SMARTAM')).resolves.toMatchObject({ id: s.smartam.id })
  })

  it('is a 404 for a course that does not exist, so a stale or mistyped selection fails loudly', async () => {
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

    // A course the handler never asks about can't break it — even one that would 404 or 422.
    const untouched = schoolRoute(async () => {})
    for (const header of ['nope', undefined]) {
      await expect(
        untouched(
          stubRequest({ 'x-school-slug': `test-${world.orgId}`, 'x-course-slug': header }),
          {} as Response,
          () => {},
        ),
      ).resolves.toBeUndefined()
    }
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

describe('GET /v1/courses/:slug', () => {
  it('finds a course by its slug for a link that names one, with no session needed', async () => {
    const s = await seedTwoCourses()
    world = s.w

    const response = await request(createServer())
      .get(`/v${env.API_VERSION}/courses/smartam`)
      .set('x-school-slug', `test-${world.orgId}`)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({ id: s.smartam.id, slug: 'smartam', name: 'Smartam' })
  })

  it('is case-insensitive, like the rest of the course lookups', async () => {
    const s = await seedTwoCourses()
    world = s.w

    const response = await request(createServer())
      .get(`/v${env.API_VERSION}/courses/VEDAM`)
      .set('x-school-slug', `test-${world.orgId}`)

    expect(response.status).toBe(200)
    expect(response.body.data.id).toBe(s.vedam.id)
  })

  it('404s for a slug that is not a course', async () => {
    const s = await seedTwoCourses()
    world = s.w

    const response = await request(createServer())
      .get(`/v${env.API_VERSION}/courses/nope`)
      .set('x-school-slug', `test-${world.orgId}`)

    expect(response.status).toBe(404)
  })
})

// -- Which courses a signed-in profile may pick from -------------------------------------------

describe('the courses a profile is part of (what the dropdown lists)', () => {
  it('a student sees only the courses they have an enrollment in', async () => {
    const s = await seedTwoCourses()
    world = s.w
    const onlyVedam = await createProfile(world, { name: 'Vedam student' })
    await enroll(world, onlyVedam, s.vedamBatch, 'student')

    const visible = await findCoursesForProfile(world.schoolDb, onlyVedam.id)

    expect(visible.map(c => c.slug)).toEqual(['vedam'])
  })

  it('a student in two courses sees both, in slug order', async () => {
    const s = await seedTwoCourses()
    world = s.w

    // `s.student` is enrolled in both.
    const visible = await findCoursesForProfile(world.schoolDb, s.student.id)

    expect(visible.map(c => c.slug)).toEqual(['smartam', 'vedam'])
  })

  it('an enrollment counts whatever its status — a finished batch is still part of your record', async () => {
    const s = await seedTwoCourses()
    world = s.w
    const alumnus = await createProfile(world, { name: 'Alumnus' })
    await enroll(world, alumnus, s.smartamBatch, 'student', 'inactive')

    expect((await findCoursesForProfile(world.schoolDb, alumnus.id)).map(c => c.slug)).toEqual([
      'smartam',
    ])
  })

  it('an instructor sees the courses they teach in', async () => {
    const s = await seedTwoCourses()
    world = s.w
    const teacher = await createProfile(world, { name: 'Teacher' })
    await enroll(world, teacher, s.smartamBatch, 'instructor')

    expect((await findCoursesForProfile(world.schoolDb, teacher.id)).map(c => c.slug)).toEqual([
      'smartam',
    ])
  })

  it('a newly approved applicant, with no batch yet, sees the course they applied to', async () => {
    const s = await seedTwoCourses()
    world = s.w
    const applicant = await createProfile(world, { name: 'Applicant' })
    const filed = await createRegistration(world, { course: s.smartam })
    await world.schoolDb
      .update(registration)
      .set({ status: 'approved', convertedProfileId: applicant.id })
      .where(eq(registration.id, filed.id))

    expect((await findCoursesForProfile(world.schoolDb, applicant.id)).map(c => c.slug)).toEqual([
      'smartam',
    ])
  })

  it('a profile with no enrollment and no registration sees no course', async () => {
    const s = await seedTwoCourses()
    world = s.w
    const stranger = await createProfile(world, { name: 'Stranger' })

    expect(await findCoursesForProfile(world.schoolDb, stranger.id)).toEqual([])
  })

  it('never includes a course only someone else is part of', async () => {
    const s = await seedTwoCourses()
    world = s.w
    const other = await createProfile(world, { name: 'Other' })
    await enroll(world, other, s.smartamBatch, 'student')
    const me = await createProfile(world, { name: 'Me' })
    await enroll(world, me, s.vedamBatch, 'student')

    expect((await findCoursesForProfile(world.schoolDb, me.id)).map(c => c.slug)).toEqual(['vedam'])
  })
})
