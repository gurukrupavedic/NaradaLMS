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
 * world's slugs are the real ones (`slmts` / `ved`, the only pair that keeps a `japam` counter), so
 * this is the only integration test that may create a school by that name (organization slugs are
 * unique). `course` is `ved` unless the world is built for another school.
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
    put: (path: string, body: object) => request(server).put(api(path)).set(headers).send(body),
  }
}

describe('counter routes', () => {
  it('logs, reads, and corrects a student’s japam', async () => {
    const s = await seed()
    world = s.w
    const me = as(s, s.student)
    const path = `/profiles/${s.student.profile.id}/counters/japam`

    const logged = await me.post(path, { count: 108 })
    expect(logged.status).toBe(200)
    expect(logged.body.data).toEqual({
      loggedOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      count: 108,
    })
    const day = logged.body.data.loggedOn

    await me.post(path, { count: 54 })
    const read = await me.get(path)
    expect(read.status).toBe(200)
    expect(read.body.data).toMatchObject({
      today: day,
      total: 162,
      lifetime: 162,
      days: [{ loggedOn: day, count: 162 }],
    })

    const corrected = await me.put(`${path}/${day}`, { count: 100 })
    expect(corrected.status).toBe(200)
    expect(corrected.body.data).toEqual({ loggedOn: day, count: 100 })
    expect((await me.get(`${path}?from=${day}&to=${day}`)).body.data.total).toBe(100)

    await me.put(`${path}/${day}`, { count: 0 })
    expect((await me.get(path)).body.data).toMatchObject({ total: 0, lifetime: 0, days: [] })
  })

  it('lets a school admin read and write anyone’s, but keeps other students out', async () => {
    const s = await seed()
    world = s.w
    const path = `/profiles/${s.student.profile.id}/counters/japam`

    expect((await as(s, s.admin).post(path, { count: 30 })).status).toBe(200)
    expect((await as(s, s.admin).get(path)).body.data.lifetime).toBe(30)

    // A classmate — part of the course, but with no teaching relationship to the student — can
    // neither see nor change it.
    expect((await as(s, s.classmate).get(path)).status).toBe(403)
    expect((await as(s, s.classmate).post(path, { count: 1 })).status).toBe(404)
    expect((await as(s, s.classmate).put(`${path}/2026-01-01`, { count: 1 })).status).toBe(404)
  })

  it('is for people in the course: a member with no place in it is refused, and so is a request that names none', async () => {
    const s = await seed()
    world = s.w
    const path = `/profiles/${s.outsider.profile.id}/counters/japam`

    // The outsider's own counter, in a course they are not part of.
    const refused = await as(s, s.outsider).post(path, { count: 1 })
    expect(refused.status).toBe(403)
    expect(refused.body.error.message).toBe('you are not part of this course')
    expect((await as(s, s.outsider).get(path)).status).toBe(403)

    const unnamed = await as(s, s.student, null).get(
      `/profiles/${s.student.profile.id}/counters/japam`,
    )
    expect(unnamed.status).toBe(400)
    expect(unnamed.body.error.message).toBe('X-Course-Slug header is required')
  })

  it('refuses a malformed request with a 400 that names the problem', async () => {
    const s = await seed()
    world = s.w
    const me = as(s, s.student)
    const path = `/profiles/${s.student.profile.id}/counters/japam`

    const badCount = await me.post(path, { count: 0 })
    expect(badCount.status).toBe(400)
    expect(badCount.body.error.message).toMatch(/^count:/)
    expect((await me.post(path, { count: 5, loggedOn: '2026-02-30' })).status).toBe(400)
    expect((await me.put(`${path}/not-a-date`, { count: 5 })).status).toBe(400)
    expect((await me.get(`${path}?from=2026-02-01&to=2026-01-01`)).status).toBe(400)
    expect((await me.get('/profiles/not-a-uuid/counters/japam')).status).toBe(400)
    expect((await me.post(path, { count: 5, loggedOn: '2999-01-01' })).status).toBe(422)
  })

  it('404s a counter the course does not keep', async () => {
    const s = await seed()
    world = s.w
    const me = as(s, s.student)

    expect((await me.get(`/profiles/${s.student.profile.id}/counters/parayanam`)).status).toBe(404)
    expect(
      (await me.post(`/profiles/${s.student.profile.id}/counters/parayanam`, { count: 1 })).status,
    ).toBe(404)
  })

  it('does not exist for a school and course that declare no counter (RR’s Puranokta)', async () => {
    const s = await seed({ slug: 'rr', course: 'pur' })
    world = s.w
    const me = as(s, s.student)
    const path = `/profiles/${s.student.profile.id}/counters/japam`

    expect((await me.get(path)).status).toBe(404)
    expect((await me.post(path, { count: 1 })).status).toBe(404)
    expect((await me.put(`${path}/2026-01-01`, { count: 1 })).status).toBe(404)
  })
})
