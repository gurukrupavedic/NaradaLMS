import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { env } from '@narada/env'

import { createServer } from '../server'
import { SessionService, type User } from '../session'
import { destroyTestWorld } from '../testing/cleanup'
import {
  createBatch,
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

/** A batch with an instructor, a student, a student on a break, and a school admin who teaches nothing. */
async function seed() {
  const w = await createTestSchool()
  const track = await createTrack(w)
  const batch = await createBatch(w, track)

  async function person(name: string, role: 'admin' | 'member') {
    const userRow = await createUser(w)
    await createMembership(w, userRow.id, { role })
    const profile = await createProfile(w, { userId: userRow.id, name })
    return { user: { ...userRow, name, isSuperAdmin: false } as User, profile }
  }

  const admin = await person('Admin', 'admin')
  const instructor = await person('Instructor', 'member')
  const student = await person('Student', 'member')
  const onBreak = await person('On break', 'member')
  await enroll(w, instructor.profile, batch, 'instructor')
  await enroll(w, student.profile, batch, 'student')
  await enroll(w, onBreak.profile, batch, 'student', 'break')

  const byId = new Map([admin, instructor, student, onBreak].map(p => [p.user.id, p.user] as const))
  vi.spyOn(SessionService, 'getCurrentUser').mockImplementation(async req => {
    const found = byId.get(String(req.headers['x-test-user']))
    if (!found) throw new Error('test: no such signed-in user')
    return found
  })

  return { w, batch, admin, instructor, student, onBreak }
}

type Seed = Awaited<ReturnType<typeof seed>>
type Person = Seed['admin']

const patch = (s: Seed, who: Person, path: string, body: object) =>
  request(createServer())
    .patch(api(path))
    .set({
      'x-school-slug': `test-${s.w.orgId}`,
      'x-test-user': who.user.id,
      'x-profile-id': who.profile.id,
    })
    .send(body)

const seatsOf = async (s: Seed) => {
  const rows = await s.w.schoolDb.query.enrollment.findMany({
    where: (t, { eq }) => eq(t.batchId, s.batch.id),
  })
  return new Map(rows.map(r => [r.profileId, r.status]))
}

describe('PATCH /batches/:batchId — marking a batch completed', () => {
  it('completes it and ends its students’ active seats, leaving staff and break rows alone', async () => {
    const s = await seed()
    world = s.w

    const res = await patch(s, s.admin, `/batches/${s.batch.id}`, { status: 'completed' })

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ id: s.batch.id, status: 'completed' })
    const seats = await seatsOf(s)
    expect(seats.get(s.student.profile.id)).toBe('inactive')
    expect(seats.get(s.onBreak.profile.id)).toBe('break')
    expect(seats.get(s.instructor.profile.id)).toBe('active')
  })

  it('leaves every seat alone when only the code or link changes', async () => {
    const s = await seed()
    world = s.w

    const res = await patch(s, s.admin, `/batches/${s.batch.id}`, {
      meetingUrl: 'https://example.org/room',
    })

    expect(res.status).toBe(200)
    expect((await seatsOf(s)).get(s.student.profile.id)).toBe('active')
  })

  it('is for school admins: a batch’s own instructor and its students are refused', async () => {
    const s = await seed()
    world = s.w

    expect(
      (await patch(s, s.instructor, `/batches/${s.batch.id}`, { status: 'completed' })).status,
    ).toBe(403)
    expect(
      (await patch(s, s.student, `/batches/${s.batch.id}`, { status: 'completed' })).status,
    ).toBe(403)
    expect((await seatsOf(s)).get(s.student.profile.id)).toBe('active')
  })

  it('404s a batch that does not exist, and 400s an empty or malformed update', async () => {
    const s = await seed()
    world = s.w

    expect(
      (await patch(s, s.admin, `/batches/${crypto.randomUUID()}`, { status: 'completed' })).status,
    ).toBe(404)
    expect((await patch(s, s.admin, `/batches/${s.batch.id}`, {})).status).toBe(400)
    expect((await patch(s, s.admin, `/batches/${s.batch.id}`, { status: 'nonsense' })).status).toBe(
      400,
    )
    expect((await patch(s, s.admin, '/batches/not-a-uuid', { status: 'completed' })).status).toBe(
      400,
    )
  })
})
