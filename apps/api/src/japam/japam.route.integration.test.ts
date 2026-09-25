import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { env } from '@narada/env'

import { createServer } from '../server'
import { SessionService, type User } from '../session'
import { destroyTestWorld } from '../testing/cleanup'
import {
  createMembership,
  createProfile,
  createTestSchool,
  createUser,
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
 * The routes over HTTP: mount path, `mergeParams`, validation and permissions. The world's slug is
 * `slmts`, the school with the japam feature — so this is the only integration test that may create
 * a school by that name (organization slugs are unique).
 */
async function seed(slug = 'slmts') {
  const w = await createTestSchool({ slug })

  async function person(name: string, role: 'admin' | 'member') {
    const userRow = await createUser(w)
    await createMembership(w, userRow.id, { role })
    const profile = await createProfile(w, { userId: userRow.id, name })
    return { user: { ...userRow, name, isSuperAdmin: false } as User, profile }
  }

  const student = await person('Student', 'member')
  const classmate = await person('Classmate', 'member')
  const admin = await person('Admin', 'admin')

  const byId = new Map([student, classmate, admin].map(p => [p.user.id, p.user] as const))
  vi.spyOn(SessionService, 'getCurrentUser').mockImplementation(async req => {
    const found = byId.get(String(req.headers['x-test-user']))
    if (!found) throw new Error('test: no such signed-in user')
    return found
  })

  return { w, student, classmate, admin }
}

type Person = Awaited<ReturnType<typeof seed>>['student']

function as(w: TestWorld, who: Person, slug = 'slmts') {
  const headers = {
    'x-school-slug': slug,
    'x-test-user': who.user.id,
    'x-profile-id': who.profile.id,
  }
  const server = createServer()
  return {
    get: (path: string) => request(server).get(api(path)).set(headers),
    post: (path: string, body: object) => request(server).post(api(path)).set(headers).send(body),
    put: (path: string, body: object) => request(server).put(api(path)).set(headers).send(body),
  }
}

describe('japam routes', () => {
  it('logs, reads, and corrects a student’s japam', async () => {
    const s = await seed()
    world = s.w
    const me = as(s.w, s.student)
    const path = `/profiles/${s.student.profile.id}/japam`

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
    const path = `/profiles/${s.student.profile.id}/japam`

    expect((await as(s.w, s.admin).post(path, { count: 30 })).status).toBe(200)
    expect((await as(s.w, s.admin).get(path)).body.data.lifetime).toBe(30)

    // A classmate who has no teaching relationship to the student can neither see nor change it.
    expect((await as(s.w, s.classmate).get(path)).status).toBe(403)
    expect((await as(s.w, s.classmate).post(path, { count: 1 })).status).toBe(404)
    expect((await as(s.w, s.classmate).put(`${path}/2026-01-01`, { count: 1 })).status).toBe(404)
  })

  it('refuses a malformed request with a 400 that names the problem', async () => {
    const s = await seed()
    world = s.w
    const me = as(s.w, s.student)
    const path = `/profiles/${s.student.profile.id}/japam`

    const badCount = await me.post(path, { count: 0 })
    expect(badCount.status).toBe(400)
    expect(badCount.body.error.message).toMatch(/^count:/)
    expect((await me.post(path, { count: 5, loggedOn: '2026-02-30' })).status).toBe(400)
    expect((await me.put(`${path}/not-a-date`, { count: 5 })).status).toBe(400)
    expect((await me.get(`${path}?from=2026-02-01&to=2026-01-01`)).status).toBe(400)
    expect((await me.get('/profiles/not-a-uuid/japam')).status).toBe(400)
    expect((await me.post(path, { count: 5, loggedOn: '2999-01-01' })).status).toBe(422)
  })

  it('does not exist in a school without the feature', async () => {
    const s = await seed('rr')
    world = s.w
    const me = as(s.w, s.student, 'rr')
    const path = `/profiles/${s.student.profile.id}/japam`

    expect((await me.get(path)).status).toBe(404)
    expect((await me.post(path, { count: 1 })).status).toBe(404)
    expect((await me.put(`${path}/2026-01-01`, { count: 1 })).status).toBe(404)
  })
})
