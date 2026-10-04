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

/** A batch with an instructor, a class TA and two students. */
async function seed() {
  const w = await createTestSchool()
  const track = await createTrack(w)
  const batch = await createBatch(w, track)

  async function person(name: string) {
    const userRow = await createUser(w)
    await createMembership(w, userRow.id, { role: 'member' })
    const profile = await createProfile(w, { userId: userRow.id, name })
    return { user: { ...userRow, name, isSuperAdmin: false } as User, profile }
  }

  const instructor = await person('Instructor')
  const ta = await person('TA')
  const student = await person('Student')
  const classmate = await person('Classmate')
  await enroll(w, instructor.profile, batch, 'instructor')
  await enroll(w, ta.profile, batch, 'ta')
  await enroll(w, student.profile, batch, 'student')
  await enroll(w, classmate.profile, batch, 'student')

  const byId = new Map([instructor, ta, student, classmate].map(p => [p.user.id, p.user] as const))
  vi.spyOn(SessionService, 'getCurrentUser').mockImplementation(async req => {
    const found = byId.get(String(req.headers['x-test-user']))
    if (!found) throw new Error('test: no such signed-in user')
    return found
  })

  return { w, batch, instructor, ta, student, classmate }
}

type Seed = Awaited<ReturnType<typeof seed>>
type Person = Seed['instructor']

const patchScores = (s: Seed, who: Person, target: Person, body: object) =>
  request(createServer())
    .patch(api(`/batches/${s.batch.id}/members/${target.profile.id}/scores`))
    .set({
      'x-school-slug': `test-${s.w.orgId}`,
      'x-test-user': who.user.id,
      'x-profile-id': who.profile.id,
    })
    .send(body)

const scoreOf = async (s: Seed, target: Person) =>
  (
    await s.w.schoolDb.query.enrollment.findFirst({
      where: (t, { and, eq }) => and(eq(t.batchId, s.batch.id), eq(t.profileId, target.profile.id)),
    })
  )?.attendanceScore

describe('PATCH /batches/:batchId/members/:profileId/scores', () => {
  it('lets the batch instructor and a class TA set a student’s score', async () => {
    const s = await seed()
    world = s.w

    expect((await patchScores(s, s.instructor, s.student, { attendanceScore: 1 })).status).toBe(200)
    expect(await scoreOf(s, s.student)).toBe(1)

    expect((await patchScores(s, s.ta, s.student, { attendanceScore: -1 })).status).toBe(200)
    expect(await scoreOf(s, s.student)).toBe(-1)
  })

  it('refuses a student, even for their own score', async () => {
    const s = await seed()
    world = s.w

    expect((await patchScores(s, s.classmate, s.student, { attendanceScore: 1 })).status).toBe(403)
    expect((await patchScores(s, s.student, s.student, { attendanceScore: 1 })).status).toBe(403)
    expect(await scoreOf(s, s.student)).toBeNull()
  })

  it('400s a value outside -1/0/1 and an empty body, and 404s an instructor’s row', async () => {
    const s = await seed()
    world = s.w

    expect((await patchScores(s, s.instructor, s.student, { attendanceScore: 2 })).status).toBe(400)
    expect((await patchScores(s, s.instructor, s.student, {})).status).toBe(400)
    expect((await patchScores(s, s.instructor, s.instructor, { attendanceScore: 1 })).status).toBe(404)
  })
})
