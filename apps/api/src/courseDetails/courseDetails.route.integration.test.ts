import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { env } from '@narada/env'

import { createServer } from '../server'
import { SessionService, type User } from '../session'
import { destroyTestWorld } from '../testing/cleanup'
import {
  createBatch,
  createCourse,
  createMembership,
  createProfile,
  createTestSchool,
  createTrack,
  createUser,
  enroll,
  type TestWorld,
} from '../testing/fixtures'

let world: TestWorld | undefined

afterEach(async () => {
  vi.restoreAllMocks()
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

const api = (path: string) => `/v${env.API_VERSION}${path}`

/**
 * The routes over HTTP: mount path, `mergeParams`, course scoping, validation and permissions. The
 * world's slugs are the real ones (`slmts` / `ved`, the only pair with a course-level counter), so
 * this is the only integration test that may create a school by that name (organization slugs are
 * unique).
 */
async function seed(school = { slug: 'slmts', course: 'ved' }) {
  const w = await createTestSchool({ slug: school.slug })
  const course = await createCourse(w, { slug: school.course, name: 'Course' })
  const batch = await createBatch(w, await createTrack(w, { course }))

  async function person(name: string, role: 'admin' | 'member', inCourse = true) {
    const userRow = await createUser(w)
    await createMembership(w, userRow.id, { role })
    const profile = await createProfile(w, { userId: userRow.id, name })
    if (inCourse) await enroll(w, profile, batch, 'student')
    return { user: { ...userRow, name, isSuperAdmin: false } as User, profile }
  }

  const student = await person('Student', 'member')
  const classmate = await person('Classmate', 'member')
  const outsider = await person('Outsider', 'member', false)
  const admin = await person('Admin', 'admin', false)

  const byId = new Map([student, classmate, outsider, admin].map(p => [p.user.id, p.user] as const))
  vi.spyOn(SessionService, 'getCurrentUser').mockImplementation(async req => {
    const found = byId.get(String(req.headers['x-test-user']))
    if (!found) throw new Error('test: no such signed-in user')
    return found
  })

  return { w, school, student, classmate, outsider, admin }
}

type Seed = Awaited<ReturnType<typeof seed>>
type Person = Seed['student']

/** A request as `who`, in the world's school, naming `course` (the world's own unless overridden; `null` for none). */
function as(s: Seed, who: Person, course: string | null = s.school.course) {
  const headers: Record<string, string> = {
    'x-school-slug': s.school.slug,
    'x-test-user': who.user.id,
    'x-profile-id': who.profile.id,
    ...(course ? { 'x-course-slug': course } : {}),
  }
  const server = createServer()
  return {
    get: (path: string) => request(server).get(api(path)).set(headers),
    post: (path: string, body: object) => request(server).post(api(path)).set(headers).send(body),
    patch: (path: string, body: object) => request(server).patch(api(path)).set(headers).send(body),
  }
}

describe('course-details routes', () => {
  it('adds to a counter, sets it, and shows it on the profile page — all for this course', async () => {
    const s = await seed()
    world = s.w
    const me = as(s, s.student)
    const id = s.student.profile.id

    // Nothing yet: the profile page says so with an empty object, not an error.
    expect((await me.get(`/profiles/${id}/detail`)).body.data.courseDetails).toEqual({})

    const added = await me.post(`/profiles/${id}/course-details/counters/japam`, { count: 108 })
    expect(added.status).toBe(200)
    expect(added.body.data).toEqual({ key: 'japam', total: 108 })
    await me.post(`/profiles/${id}/course-details/counters/japam`, { count: 54 })
    expect((await me.get(`/profiles/${id}/detail`)).body.data.courseDetails).toEqual({ japam: 162 })

    const set = await me.patch(`/profiles/${id}/course-details`, { details: { japam: 100 } })
    expect(set.status).toBe(200)
    expect(set.body.data).toEqual({ details: { japam: 100 } })
    expect((await me.get(`/profiles/${id}/detail`)).body.data.courseDetails).toEqual({ japam: 100 })
  })

  it('lets a school admin write anyone’s, but keeps other students out', async () => {
    const s = await seed()
    world = s.w
    const id = s.student.profile.id

    expect(
      (await as(s, s.admin).post(`/profiles/${id}/course-details/counters/japam`, { count: 30 }))
        .status,
    ).toBe(200)
    expect((await as(s, s.admin).get(`/profiles/${id}/detail`)).body.data.courseDetails).toEqual({
      japam: 30,
    })

    // A classmate — part of the course, but with no teaching relationship to the student — can
    // neither see nor change it.
    expect((await as(s, s.classmate).get(`/profiles/${id}/detail`)).status).toBe(403)
    expect(
      (await as(s, s.classmate).post(`/profiles/${id}/course-details/counters/japam`, { count: 1 }))
        .status,
    ).toBe(404)
    expect(
      (await as(s, s.classmate).patch(`/profiles/${id}/course-details`, { details: { japam: 1 } }))
        .status,
    ).toBe(404)
  })

  it('is for people in the course: a member with no place in it is refused, and so is a request that names none', async () => {
    const s = await seed()
    world = s.w
    const path = `/profiles/${s.outsider.profile.id}/course-details/counters/japam`

    const refused = await as(s, s.outsider).post(path, { count: 1 })
    expect(refused.status).toBe(403)
    expect(refused.body.error.message).toBe('you are not part of this course')

    const unnamed = await as(s, s.student, null).post(
      `/profiles/${s.student.profile.id}/course-details/counters/japam`,
      { count: 1 },
    )
    expect(unnamed.status).toBe(400)
    expect(unnamed.body.error.message).toBe('X-Course-Slug header is required')
  })

  it('refuses a malformed request with a 400 that names the problem', async () => {
    const s = await seed()
    world = s.w
    const me = as(s, s.student)
    const base = `/profiles/${s.student.profile.id}/course-details`

    const badCount = await me.post(`${base}/counters/japam`, { count: 0 })
    expect(badCount.status).toBe(400)
    expect(badCount.body.error.message).toMatch(/^count:/)
    expect((await me.patch(base, { details: {} })).status).toBe(400)
    const unknown = await me.patch(base, { details: { gothram: 'A' } })
    expect(unknown.status).toBe(400)
    expect(unknown.body.error.message).toBe('details.gothram: is not a field for this school')
    expect((await me.patch(base, { details: { japam: -1 } })).status).toBe(400)
    expect(
      (await me.post('/profiles/not-a-uuid/course-details/counters/japam', { count: 1 })).status,
    ).toBe(400)
  })

  it('404s a counter the course does not keep', async () => {
    const s = await seed()
    world = s.w

    const res = await as(s, s.student).post(
      `/profiles/${s.student.profile.id}/course-details/counters/parayanam`,
      { count: 1 },
    )
    expect(res.status).toBe(404)
  })

  it('has nothing to edit in a school and course that declare no course-level fields (RR’s Puranokta)', async () => {
    const s = await seed({ slug: 'rr', course: 'pur' })
    world = s.w
    const me = as(s, s.student)
    const base = `/profiles/${s.student.profile.id}/course-details`

    expect((await me.post(`${base}/counters/japam`, { count: 1 })).status).toBe(404)
    expect((await me.patch(base, { details: { japam: 1 } })).status).toBe(404)
    // The profile page still works and reports an empty course-level component.
    expect(
      (await me.get(`/profiles/${s.student.profile.id}/detail`)).body.data.courseDetails,
    ).toEqual({})
  })
})
