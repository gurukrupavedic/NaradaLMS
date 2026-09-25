import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { env } from '@narada/env'

import { createServer } from '../server'
import { SessionService, type User } from '../session'
import { destroyTestWorld } from '../testing/cleanup'
import {
  createBatch,
  createExam,
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
 * A student with a scheduled sitting, their batch's instructor, a school admin who teaches nothing,
 * and a classmate — the people who may or may not reschedule or cancel it.
 */
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
  const classmate = await person('Classmate', 'member')
  await enroll(w, instructor.profile, batch, 'instructor')
  await enroll(w, student.profile, batch, 'student')
  await enroll(w, classmate.profile, batch, 'student')
  const sitting = await createExam(w, {
    student: student.profile,
    track,
    scheduledAt: new Date('2030-01-01T09:00:00Z'),
  })

  const byId = new Map(
    [admin, instructor, student, classmate].map(p => [p.user.id, p.user] as const),
  )
  vi.spyOn(SessionService, 'getCurrentUser').mockImplementation(async req => {
    const found = byId.get(String(req.headers['x-test-user']))
    if (!found) throw new Error('test: no such signed-in user')
    return found
  })

  return { w, sitting, admin, instructor, student, classmate }
}

type Seed = Awaited<ReturnType<typeof seed>>
type Person = Seed['admin']

const patch = (s: Seed, who: Person, examId: string, body: object) =>
  request(createServer())
    .patch(api(`/exams/${examId}`))
    .set({
      'x-school-slug': `test-${s.w.orgId}`,
      'x-test-user': who.user.id,
      'x-profile-id': who.profile.id,
    })
    .send(body)

const statusOf = async (s: Seed) =>
  (await s.w.schoolDb.query.exam.findFirst({ where: (t, { eq }) => eq(t.id, s.sitting.id) }))
    ?.status

describe('PATCH /exams/:examId — rescheduling and cancelling a sitting', () => {
  it('lets the student’s batch instructor reschedule it', async () => {
    const s = await seed()
    world = s.w

    const res = await patch(s, s.instructor, s.sitting.id, { scheduledAt: '2030-02-01T09:00:00Z' })

    expect(res.status).toBe(200)
    expect(new Date(res.body.data.scheduledAt).toISOString()).toBe('2030-02-01T09:00:00.000Z')
    expect(res.body.data.status).toBe('scheduled')
  })

  it('lets the instructor cancel it, and then it can go nowhere else', async () => {
    const s = await seed()
    world = s.w

    const cancelled = await patch(s, s.instructor, s.sitting.id, { status: 'cancelled' })
    expect(cancelled.status).toBe(200)
    expect(await statusOf(s)).toBe('cancelled')

    // A cancelled sitting is terminal.
    const revived = await patch(s, s.instructor, s.sitting.id, { status: 'inProgress' })
    expect(revived.status).toBe(409)
    expect(await statusOf(s)).toBe('cancelled')
  })

  it('is a batch-role decision: the student, a classmate, and an admin who teaches nothing are refused', async () => {
    const s = await seed()
    world = s.w

    for (const who of [s.student, s.classmate, s.admin]) {
      const res = await patch(s, who, s.sitting.id, { status: 'cancelled' })
      expect(res.status, who.profile.name).toBe(403)
    }
    expect(await statusOf(s)).toBe('scheduled')
  })

  it('cannot mark a sitting completed — only recording a result does that', async () => {
    const s = await seed()
    world = s.w

    expect((await patch(s, s.instructor, s.sitting.id, { status: 'completed' })).status).toBe(400)
    expect(await statusOf(s)).toBe('scheduled')
  })

  it('404s a sitting that does not exist, and 400s an empty or malformed update', async () => {
    const s = await seed()
    world = s.w

    expect(
      (await patch(s, s.instructor, crypto.randomUUID(), { status: 'cancelled' })).status,
    ).toBe(404)
    expect((await patch(s, s.instructor, s.sitting.id, {})).status).toBe(400)
    expect(
      (await patch(s, s.instructor, s.sitting.id, { scheduledAt: 'next tuesday' })).status,
    ).toBe(400)
    expect((await patch(s, s.instructor, 'not-a-uuid', { status: 'cancelled' })).status).toBe(400)
  })
})
