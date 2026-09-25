import { afterEach, describe, expect, it } from 'vitest'

import { profile } from '@narada/db'

import type { User } from '../session'
import type { AccessPolicy } from '../utils/accessPolicy'
import { todayIn } from '../utils/calendarDate'
import { destroyTestWorld } from '../testing/cleanup'
import { createCourse, createProfile, createTestSchool, type TestWorld } from '../testing/fixtures'
import * as repository from './repository'
import { log, setDay, summary } from './service'

// The service only ever calls `access.isSchoolAdmin()`, and only needs the school's and course's
// slugs — a minimal fake avoids a real membership round trip in tests that aren't about access.
function access(isSchoolAdmin: boolean): AccessPolicy {
  return { isSchoolAdmin: () => isSchoolAdmin } as unknown as AccessPolicy
}

const owner = { id: 'user-counter', isSuperAdmin: false } as User
const stranger = { id: 'someone-else', isSuperAdmin: false } as User

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

/** A world with SLMTS's Vedam course (`ved`, the one that keeps a `japam` counter) already in it. */
async function seed() {
  const w = await createTestSchool()
  const ved = await createCourse(w, { slug: 'ved', name: 'Vedam' })
  return { w, ved }
}
type Seed = Awaited<ReturnType<typeof seed>>

function as(
  s: Seed,
  user: User,
  isSchoolAdmin = false,
  where: { school: string; course: { id: string; slug: string } } = {
    school: 'slmts',
    course: s.ved,
  },
) {
  return {
    db: s.w.schoolDb,
    school: { slug: where.school },
    course: { id: where.course.id, slug: where.course.slug },
    user,
    access: access(isSchoolAdmin),
  }
}

const TODAY = todayIn('UTC')
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)

describe('log', () => {
  it("adds to the day and reports the day's running count", async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })

    expect(await log(as(s, owner), p.id, 'japam', { count: 108 })).toEqual({
      loggedOn: TODAY,
      count: 108,
    })
    expect(await log(as(s, owner), p.id, 'japam', { count: 54 })).toEqual({
      loggedOn: TODAY,
      count: 162,
    })
  })

  it('counts every one of many concurrent increments (an atomic add, not read-then-write)', async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })

    await Promise.all(
      Array.from({ length: 25 }, () => log(as(s, owner), p.id, 'japam', { count: 10 })),
    )

    const result = await summary(as(s, owner), p.id, 'japam', {})
    expect(result.lifetime).toBe(250)
    expect(result.days).toEqual([{ loggedOn: TODAY, count: 250 }])
  })

  it("files a day under the student's own today, from the time zone on their profile", async () => {
    const s = await seed()
    world = s.w
    // UTC+14 and UTC-11 are 25 hours apart, so their calendar dates are never the same.
    const ahead = await createProfile(s.w, {
      userId: owner.id,
      countryTimeZone: 'Pacific/Kiritimati',
    })
    const behind = await createProfile(s.w, {
      userId: owner.id,
      countryTimeZone: 'Pacific/Pago_Pago',
    })

    const a = await log(as(s, owner), ahead.id, 'japam', { count: 1 })
    const b = await log(as(s, owner), behind.id, 'japam', { count: 1 })

    expect(a.loggedOn).toBe(todayIn('Pacific/Kiritimati'))
    expect(b.loggedOn).toBe(todayIn('Pacific/Pago_Pago'))
    expect(a.loggedOn).not.toBe(b.loggedOn)
  })

  it('logs a past day, and refuses a future one', async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })

    await expect(
      log(as(s, owner), p.id, 'japam', { count: 5, loggedOn: daysAgo(3) }),
    ).resolves.toEqual({ loggedOn: daysAgo(3), count: 5 })
    await expect(
      log(as(s, owner), p.id, 'japam', { count: 5, loggedOn: '2999-01-01' }),
    ).rejects.toMatchObject({ statusCode: 422 })
  })

  it('refuses to take a day past the daily cap, and leaves the day as it was', async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })

    await log(as(s, owner), p.id, 'japam', { count: 600_000 })
    await expect(log(as(s, owner), p.id, 'japam', { count: 600_000 })).rejects.toMatchObject({
      statusCode: 422,
      message: "a day's count can't exceed 1000000",
    })

    expect((await summary(as(s, owner), p.id, 'japam', {})).lifetime).toBe(600_000)
  })

  it('does not mix up two profiles', async () => {
    const s = await seed()
    world = s.w
    const one = await createProfile(s.w, { userId: owner.id })
    const two = await createProfile(s.w, { userId: owner.id })

    await log(as(s, owner), one.id, 'japam', { count: 7 })
    await log(as(s, owner), two.id, 'japam', { count: 11 })

    expect((await summary(as(s, owner), one.id, 'japam', {})).lifetime).toBe(7)
    expect((await summary(as(s, owner), two.id, 'japam', {})).lifetime).toBe(11)
  })
})

describe('per course', () => {
  // The definitions are static (`@narada/profile-fields`), so only Vedam keeps a counter through the
  // service. The storage is what has to keep two courses apart, so that is tested directly: the
  // same student and counter key in two courses is two separate counts.
  it("keeps one student's counter separate in each course", async () => {
    const s = await seed()
    world = s.w
    const other = await createCourse(s.w, { slug: 'other', name: 'Other' })
    const p = await createProfile(s.w, { userId: owner.id })
    const inVed = { profileId: p.id, courseId: s.ved.id, counterKey: 'japam' }
    const inOther = { profileId: p.id, courseId: other.id, counterKey: 'japam' }

    await repository.addToDay(s.w.schoolDb, inVed, TODAY, 100)
    await repository.addToDay(s.w.schoolDb, inVed, TODAY, 8)
    await repository.addToDay(s.w.schoolDb, inOther, TODAY, 5)

    expect(await repository.summarize(s.w.schoolDb, inVed, {})).toMatchObject({ lifetime: 108 })
    expect(await repository.summarize(s.w.schoolDb, inOther, {})).toMatchObject({ lifetime: 5 })

    await repository.setDay(s.w.schoolDb, inOther, TODAY, 0)
    expect(await repository.summarize(s.w.schoolDb, inVed, {})).toMatchObject({ lifetime: 108 })
    expect(await repository.summarize(s.w.schoolDb, inOther, {})).toMatchObject({ lifetime: 0 })
  })

  it('keeps two counters in one course separate, by key', async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })
    const scope = (counterKey: string) => ({ profileId: p.id, courseId: s.ved.id, counterKey })

    await repository.addToDay(s.w.schoolDb, scope('japam'), TODAY, 3)
    await repository.addToDay(s.w.schoolDb, scope('parayanam'), TODAY, 40)

    expect((await repository.summarize(s.w.schoolDb, scope('japam'), {})).lifetime).toBe(3)
    expect((await repository.summarize(s.w.schoolDb, scope('parayanam'), {})).lifetime).toBe(40)
  })

  it('does not exist in a course the school does not declare it for', async () => {
    const s = await seed()
    world = s.w
    const other = await createCourse(s.w, { slug: 'other', name: 'Other' })
    const p = await createProfile(s.w, { userId: owner.id })
    const there = as(s, owner, false, { school: 'slmts', course: other })
    const rr = as(s, owner, false, { school: 'rr', course: { id: s.ved.id, slug: 'pur' } })

    await expect(log(there, p.id, 'japam', { count: 1 })).rejects.toMatchObject({ statusCode: 404 })
    await expect(summary(there, p.id, 'japam', {})).rejects.toMatchObject({ statusCode: 404 })
    await expect(log(rr, p.id, 'japam', { count: 1 })).rejects.toMatchObject({ statusCode: 404 })
    await expect(log(as(s, owner), p.id, 'not-a-counter', { count: 1 })).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})

describe('who may write', () => {
  it("404s someone else's profile for a non-admin, and writes nothing", async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })

    await expect(log(as(s, stranger), p.id, 'japam', { count: 1 })).rejects.toMatchObject({
      statusCode: 404,
    })
    await expect(setDay(as(s, stranger), p.id, 'japam', TODAY, 1)).rejects.toMatchObject({
      statusCode: 404,
    })
    expect((await summary(as(s, owner), p.id, 'japam', {})).lifetime).toBe(0)
  })

  it('lets a school admin log for, and correct, anyone', async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })

    await log(as(s, stranger, true), p.id, 'japam', { count: 30 })
    await setDay(as(s, stranger, true), p.id, 'japam', TODAY, 20)

    expect((await summary(as(s, owner), p.id, 'japam', {})).lifetime).toBe(20)
  })

  it('will not log for a deactivated profile', async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })
    await s.w.schoolDb.update(profile).set({ deletedAt: new Date() })

    await expect(log(as(s, owner), p.id, 'japam', { count: 1 })).rejects.toMatchObject({
      statusCode: 404,
    })
    await expect(log(as(s, stranger, true), p.id, 'japam', { count: 1 })).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})

describe('setDay', () => {
  it('sets a day outright, up or down', async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })

    await log(as(s, owner), p.id, 'japam', { count: 100 })
    expect(await setDay(as(s, owner), p.id, 'japam', TODAY, 40)).toEqual({
      loggedOn: TODAY,
      count: 40,
    })
    expect(await setDay(as(s, owner), p.id, 'japam', TODAY, 500)).toEqual({
      loggedOn: TODAY,
      count: 500,
    })
    expect((await summary(as(s, owner), p.id, 'japam', {})).days).toEqual([
      { loggedOn: TODAY, count: 500 },
    ])
  })

  it('creates a day that was never logged', async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })

    await setDay(as(s, owner), p.id, 'japam', daysAgo(5), 9)

    expect((await summary(as(s, owner), p.id, 'japam', {})).days).toEqual([
      { loggedOn: daysAgo(5), count: 9 },
    ])
  })

  it('clears a day at 0, leaving no row behind', async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })

    await log(as(s, owner), p.id, 'japam', { count: 100 })
    expect(await setDay(as(s, owner), p.id, 'japam', TODAY, 0)).toEqual({
      loggedOn: TODAY,
      count: 0,
    })

    const result = await summary(as(s, owner), p.id, 'japam', {})
    expect(result.days).toEqual([])
    expect(result.lifetime).toBe(0)
  })

  it('refuses a future day', async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })

    await expect(setDay(as(s, owner), p.id, 'japam', '2999-01-01', 5)).rejects.toMatchObject({
      statusCode: 422,
    })
  })
})

describe('summary', () => {
  it('reports the window and the lifetime separately, days newest first', async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })
    for (const [loggedOn, count] of [
      ['2024-12-31', 1000],
      ['2025-01-01', 200],
      ['2025-06-15', 30],
      ['2026-01-01', 4],
    ] as const) {
      await log(as(s, owner), p.id, 'japam', { count, loggedOn })
    }

    const year2025 = await summary(as(s, owner), p.id, 'japam', {
      from: '2025-01-01',
      to: '2025-12-31',
    })
    expect(year2025.total).toBe(230)
    expect(year2025.lifetime).toBe(1234)
    expect(year2025.days.map(d => d.loggedOn)).toEqual(['2025-06-15', '2025-01-01'])

    const everything = await summary(as(s, owner), p.id, 'japam', {})
    expect(everything.total).toBe(1234)
    expect(everything.days.map(d => d.loggedOn)).toEqual([
      '2026-01-01',
      '2025-06-15',
      '2025-01-01',
      '2024-12-31',
    ])
  })

  it("carries the student's today, and reads zero for someone who has never logged", async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id, countryTimeZone: 'Pacific/Kiritimati' })

    expect(await summary(as(s, owner), p.id, 'japam', {})).toEqual({
      today: todayIn('Pacific/Kiritimati'),
      total: 0,
      lifetime: 0,
      days: [],
    })
  })

  it('404s a profile that does not exist', async () => {
    const s = await seed()
    world = s.w

    await expect(summary(as(s, owner), crypto.randomUUID(), 'japam', {})).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})
