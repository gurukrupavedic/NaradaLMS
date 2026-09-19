import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { eq } from 'drizzle-orm'

import { registration } from '@narada/db'
import { env } from '@narada/env'

import { createServer } from '../server'
import { SessionService, User } from '../session'
import { destroyTestWorld } from '../testing/cleanup'
import {
  createBatch,
  createChapter,
  createCourse,
  createMembership,
  createProfile,
  createRegistration,
  createTestSchool,
  createTrack,
  createUser,
  enroll,
  type TestWorld,
} from '../testing/fixtures'
import { AccessPolicy } from '../utils/accessPolicy'
import { findForProfile } from './repository'

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
 * Two courses with a published chapter each, and four kinds of caller:
 *  - `admin`: a school admin, part of every course by role
 *  - `vedamStudent`: enrolled in a Vedam batch only
 *  - `pastStudent`: finished a Smartam batch (an inactive enrollment is still "part of" it)
 *  - `nobody`: a school member whose profile has no enrollment and no registration anywhere
 */
async function seed() {
  const w = await createTestSchool()
  const vedam = await createCourse(w, { slug: 'vedam', name: 'Vedam' })
  const smartam = await createCourse(w, { slug: 'smartam', name: 'Smartam' })
  const vedamTrack = await createTrack(w, { course: vedam })
  const smartamTrack = await createTrack(w, { course: smartam })
  const vedamChapter = await createChapter(w, vedamTrack, { status: 'published' })
  const smartamChapter = await createChapter(w, smartamTrack, { status: 'published' })
  const vedamBatch = await createBatch(w, vedamTrack)
  const smartamBatch = await createBatch(w, smartamTrack)

  async function person(name: string, role: 'admin' | 'member') {
    const userRow = await createUser(w)
    await createMembership(w, userRow.id, { role })
    const profile = await createProfile(w, { userId: userRow.id, name })
    const user = new User(userRow.id, name, userRow.email, true, false, new Date(), new Date())
    return { user, profile }
  }

  const admin = await person('Admin', 'admin')
  const vedamStudent = await person('Vedam student', 'member')
  const pastStudent = await person('Past student', 'member')
  const nobody = await person('Nobody', 'member')
  await enroll(w, vedamStudent.profile, vedamBatch, 'student')
  await enroll(w, pastStudent.profile, smartamBatch, 'student', 'inactive')

  // Route the fake session by a header the tests set, so each request is "signed in" as someone.
  const byId = new Map(
    [admin, vedamStudent, pastStudent, nobody].map(p => [p.user.id, p.user] as const),
  )
  vi.spyOn(SessionService, 'getCurrentUser').mockImplementation(async req => {
    const found = byId.get(String(req.headers['x-test-user']))
    if (!found) throw new Error('test: no such signed-in user')
    return found
  })

  return {
    w,
    vedam,
    smartam,
    vedamTrack,
    smartamTrack,
    vedamChapter,
    smartamChapter,
    admin,
    vedamStudent,
    pastStudent,
    nobody,
  }
}

type Seed = Awaited<ReturnType<typeof seed>>
type Person = Seed['admin']

/** An approved applicant: a profile with no batch yet, created from a registration for `course`. */
async function createApplicant(w: TestWorld, course: Seed['vedam']) {
  const applicant = await createProfile(w, { name: 'Applicant' })
  const filed = await createRegistration(w, { course })
  await w.schoolDb
    .update(registration)
    .set({ status: 'approved', convertedProfileId: applicant.id })
    .where(eq(registration.id, filed.id))
  return applicant
}

/** A request as `who`, naming `course` (or none). */
function get(s: Seed, path: string, who: Person, course?: string) {
  const req = request(createServer())
    .get(api(path))
    .set('x-school-slug', `test-${s.w.orgId}`)
    .set('x-test-user', who.user.id)
    .set('x-profile-id', who.profile.id)
  return course ? req.set('x-course-slug', course) : req
}

describe('a course-scoped read always names its course', () => {
  it('400s a request that names none, on every course-scoped route', async () => {
    const s = await seed()
    world = s.w

    for (const path of [
      '/tracks',
      '/me/dashboard',
      '/batches',
      '/batches/open',
      '/exams',
      '/enrollment-requests',
    ]) {
      const response = await get(s, path, s.admin)
      expect(response.status, path).toBe(400)
      expect(response.body.error.message, path).toBe('X-Course-Slug header is required')
    }
  })

  it('404s a course that does not exist rather than reading the wrong one', async () => {
    const s = await seed()
    world = s.w

    const response = await get(s, '/tracks', s.admin, 'nope')

    expect(response.status).toBe(404)
  })
})

describe('GET /tracks — the course the request names', () => {
  it('lists that course’s tracks for someone who is part of it', async () => {
    const s = await seed()
    world = s.w

    const response = await get(s, '/tracks', s.vedamStudent, 'vedam')

    expect(response.status).toBe(200)
    expect(response.body.data.map((t: { id: string }) => t.id)).toEqual([s.vedamTrack.id])
  })

  it('refuses a course the caller isn’t part of, however it is named', async () => {
    const s = await seed()
    world = s.w

    const response = await get(s, '/tracks', s.vedamStudent, 'smartam')

    expect(response.status).toBe(403)
  })

  it('lets an admin list any course', async () => {
    const s = await seed()
    world = s.w

    const response = await get(s, '/tracks', s.admin, 'smartam')

    expect(response.status).toBe(200)
    expect(response.body.data.map((t: { id: string }) => t.id)).toEqual([s.smartamTrack.id])
  })

  it('counts a finished batch as being part of the course', async () => {
    const s = await seed()
    world = s.w

    const response = await get(s, '/tracks', s.pastStudent, 'smartam')

    expect(response.status).toBe(200)
  })
})

describe('GET /tracks/:id and /chapters/:id — by id', () => {
  it('serves content in a course the caller is part of', async () => {
    const s = await seed()
    world = s.w

    const track = await get(s, `/tracks/${s.vedamTrack.id}`, s.vedamStudent)
    const chapter = await get(s, `/chapters/${s.vedamChapter.id}`, s.vedamStudent)

    expect(track.status).toBe(200)
    expect(chapter.status).toBe(200)
  })

  it('404s content in another course — the same as if it did not exist — even with no header at all', async () => {
    const s = await seed()
    world = s.w

    const otherTrack = await get(s, `/tracks/${s.smartamTrack.id}`, s.vedamStudent)
    const otherChapter = await get(s, `/chapters/${s.smartamChapter.id}`, s.vedamStudent)
    const missingChapter = await get(
      s,
      '/chapters/00000000-0000-4000-8000-000000000000',
      s.vedamStudent,
    )

    expect(otherTrack.status).toBe(404)
    expect(otherChapter.status).toBe(404)
    expect(missingChapter.status).toBe(404)
    expect(otherChapter.body).toEqual(missingChapter.body)
  })

  it('ignores a header that claims the right course: the content decides, not the header', async () => {
    const s = await seed()
    world = s.w

    const response = await get(s, `/chapters/${s.smartamChapter.id}`, s.vedamStudent, 'vedam')

    expect(response.status).toBe(404)
  })

  it('lets an admin read anything', async () => {
    const s = await seed()
    world = s.w

    const response = await get(s, `/chapters/${s.smartamChapter.id}`, s.admin)

    expect(response.status).toBe(200)
  })

  it('shows a member with no course anywhere nothing', async () => {
    const s = await seed()
    world = s.w

    const track = await get(s, `/tracks/${s.vedamTrack.id}`, s.nobody)
    const chapter = await get(s, `/chapters/${s.vedamChapter.id}`, s.nobody)

    expect(track.status).toBe(404)
    expect(chapter.status).toBe(404)
  })
})

describe('the dashboard carries a course’s track catalogue, so it is gated too', () => {
  it('serves /me/dashboard for a course the caller is part of', async () => {
    const s = await seed()
    world = s.w

    const response = await get(s, '/me/dashboard', s.vedamStudent, 'vedam')

    expect(response.status).toBe(200)
    expect(response.body.data.tracks.map((t: { id: string }) => t.id)).toEqual([s.vedamTrack.id])
  })

  it('refuses /me/dashboard for a course the caller is not part of', async () => {
    const s = await seed()
    world = s.w

    const response = await get(s, '/me/dashboard', s.vedamStudent, 'smartam')

    expect(response.status).toBe(403)
  })

  it('refuses /profiles/:id/detail when the caller is not part of the course it names', async () => {
    const s = await seed()
    world = s.w

    // A student may view their own profile page, but not through a course they have no place in.
    const own = await get(
      s,
      `/profiles/${s.vedamStudent.profile.id}/detail`,
      s.vedamStudent,
      'smartam',
    )

    expect(own.status).toBe(403)
  })
})

describe('"part of a course" is one rule for the dropdown and the gate', () => {
  it('canReadCourseContent agrees with the course dropdown’s list for every kind of caller', async () => {
    const s = await seed()
    world = s.w
    const applicant = await createApplicant(s.w, s.smartam)

    for (const who of [s.vedamStudent.profile, s.pastStudent.profile, s.nobody.profile, applicant]) {
      const access = await AccessPolicy.load({
        db: s.w.schoolDb,
        school: { id: s.w.orgId } as never,
        user: s.vedamStudent.user,
        profile: who,
      })
      const offered = new Set((await findForProfile(s.w.schoolDb, who.id)).map(c => c.id))

      for (const c of [s.vedam, s.smartam]) {
        // The policy is loaded as a non-admin member, so it asks the same question as the dropdown.
        await expect(access.canReadCourseContent(c.id)).resolves.toBe(offered.has(c.id))
      }
    }
  })

  it('counts the course of the registration that created a profile', async () => {
    const s = await seed()
    world = s.w
    const applicant = await createApplicant(s.w, s.smartam)
    const access = await AccessPolicy.load({
      db: s.w.schoolDb,
      school: { id: s.w.orgId } as never,
      user: s.vedamStudent.user,
      profile: applicant,
    })

    await expect(access.canReadCourseContent(s.smartam.id)).resolves.toBe(true)
    await expect(access.canReadCourseContent(s.vedam.id)).resolves.toBe(false)
  })
})
