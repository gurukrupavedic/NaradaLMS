import { afterEach, describe, expect, it } from 'vitest'

import { profile } from '@narada/db'

import type { User } from '../session'
import type { AccessPolicy } from '../utils/accessPolicy'
import { todayIn } from '../utils/calendarDate'
import { destroyTestWorld } from '../testing/cleanup'
import { createProfile, createTestSchool, type TestWorld } from '../testing/fixtures'
import { log, setDay, summary } from './service'

// The service only ever calls `access.isSchoolAdmin()`, and only needs the school's slug — a minimal
// fake avoids a real membership round trip in tests that aren't about access.
function access(isSchoolAdmin: boolean): AccessPolicy {
  return { isSchoolAdmin: () => isSchoolAdmin } as unknown as AccessPolicy
}

const owner = { id: 'user-japam', isSuperAdmin: false } as User
const stranger = { id: 'someone-else', isSuperAdmin: false } as User

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

// `slmts` is the school with the japam feature; the world's own random slug is not.
function as(w: TestWorld, user: User, isSchoolAdmin = false, slug = 'slmts') {
  return { db: w.schoolDb, school: { slug }, user, access: access(isSchoolAdmin) }
}

const TODAY = todayIn('UTC')
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)

describe('log', () => {
  it("adds to the day and reports the day's running count", async () => {
    world = await createTestSchool()
    const p = await createProfile(world, { userId: owner.id })

    expect(await log(as(world, owner), p.id, { count: 108 })).toEqual({
      loggedOn: TODAY,
      count: 108,
    })
    expect(await log(as(world, owner), p.id, { count: 54 })).toEqual({
      loggedOn: TODAY,
      count: 162,
    })
  })

  it('counts every one of many concurrent increments (an atomic add, not read-then-write)', async () => {
    world = await createTestSchool()
    const p = await createProfile(world, { userId: owner.id })

    await Promise.all(Array.from({ length: 25 }, () => log(as(world!, owner), p.id, { count: 10 })))

    const result = await summary(as(world, owner), p.id, {})
    expect(result.lifetime).toBe(250)
    expect(result.days).toEqual([{ loggedOn: TODAY, count: 250 }])
  })

  it("files a day under the student's own today, from the time zone on their profile", async () => {
    world = await createTestSchool()
    // UTC+14 and UTC-11 are 25 hours apart, so their calendar dates are never the same.
    const ahead = await createProfile(world, {
      userId: owner.id,
      countryTimeZone: 'Pacific/Kiritimati',
    })
    const behind = await createProfile(world, {
      userId: owner.id,
      countryTimeZone: 'Pacific/Pago_Pago',
    })

    const a = await log(as(world, owner), ahead.id, { count: 1 })
    const b = await log(as(world, owner), behind.id, { count: 1 })

    expect(a.loggedOn).toBe(todayIn('Pacific/Kiritimati'))
    expect(b.loggedOn).toBe(todayIn('Pacific/Pago_Pago'))
    expect(a.loggedOn).not.toBe(b.loggedOn)
  })

  it('logs a past day, and refuses a future one', async () => {
    world = await createTestSchool()
    const p = await createProfile(world, { userId: owner.id })

    await expect(log(as(world, owner), p.id, { count: 5, loggedOn: daysAgo(3) })).resolves.toEqual({
      loggedOn: daysAgo(3),
      count: 5,
    })
    await expect(
      log(as(world, owner), p.id, { count: 5, loggedOn: '2999-01-01' }),
    ).rejects.toMatchObject({
      statusCode: 422,
    })
  })

  it('refuses to take a day past the daily cap, and leaves the day as it was', async () => {
    world = await createTestSchool()
    const p = await createProfile(world, { userId: owner.id })

    await log(as(world, owner), p.id, { count: 600_000 })
    await expect(log(as(world, owner), p.id, { count: 600_000 })).rejects.toMatchObject({
      statusCode: 422,
      message: "a day's japam can't exceed 1000000",
    })

    expect((await summary(as(world, owner), p.id, {})).lifetime).toBe(600_000)
  })

  it('does not mix up two profiles', async () => {
    world = await createTestSchool()
    const one = await createProfile(world, { userId: owner.id })
    const two = await createProfile(world, { userId: owner.id })

    await log(as(world, owner), one.id, { count: 7 })
    await log(as(world, owner), two.id, { count: 11 })

    expect((await summary(as(world, owner), one.id, {})).lifetime).toBe(7)
    expect((await summary(as(world, owner), two.id, {})).lifetime).toBe(11)
  })
})

describe('who may write', () => {
  it("404s someone else's profile for a non-admin, and writes nothing", async () => {
    world = await createTestSchool()
    const p = await createProfile(world, { userId: owner.id })

    await expect(log(as(world, stranger), p.id, { count: 1 })).rejects.toMatchObject({
      statusCode: 404,
    })
    await expect(setDay(as(world, stranger), p.id, TODAY, 1)).rejects.toMatchObject({
      statusCode: 404,
    })
    expect((await summary(as(world, owner), p.id, {})).lifetime).toBe(0)
  })

  it('lets a school admin log for, and correct, anyone', async () => {
    world = await createTestSchool()
    const p = await createProfile(world, { userId: owner.id })

    await log(as(world, stranger, true), p.id, { count: 30 })
    await setDay(as(world, stranger, true), p.id, TODAY, 20)

    expect((await summary(as(world, owner), p.id, {})).lifetime).toBe(20)
  })

  it('will not log for a deactivated profile', async () => {
    world = await createTestSchool()
    const p = await createProfile(world, { userId: owner.id })
    await world.schoolDb.update(profile).set({ deletedAt: new Date() })

    await expect(log(as(world, owner), p.id, { count: 1 })).rejects.toMatchObject({
      statusCode: 404,
    })
    await expect(log(as(world, stranger, true), p.id, { count: 1 })).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('does not exist for a school without the feature', async () => {
    world = await createTestSchool()
    const p = await createProfile(world, { userId: owner.id })

    await expect(log(as(world, owner, false, 'rr'), p.id, { count: 1 })).rejects.toMatchObject({
      statusCode: 404,
    })
    await expect(summary(as(world, owner, false, 'rr'), p.id, {})).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})

describe('setDay', () => {
  it('sets a day outright, up or down', async () => {
    world = await createTestSchool()
    const p = await createProfile(world, { userId: owner.id })

    await log(as(world, owner), p.id, { count: 100 })
    expect(await setDay(as(world, owner), p.id, TODAY, 40)).toEqual({ loggedOn: TODAY, count: 40 })
    expect(await setDay(as(world, owner), p.id, TODAY, 500)).toEqual({
      loggedOn: TODAY,
      count: 500,
    })
    expect((await summary(as(world, owner), p.id, {})).days).toEqual([
      { loggedOn: TODAY, count: 500 },
    ])
  })

  it('creates a day that was never logged', async () => {
    world = await createTestSchool()
    const p = await createProfile(world, { userId: owner.id })

    await setDay(as(world, owner), p.id, daysAgo(5), 9)

    expect((await summary(as(world, owner), p.id, {})).days).toEqual([
      { loggedOn: daysAgo(5), count: 9 },
    ])
  })

  it('clears a day at 0, leaving no row behind', async () => {
    world = await createTestSchool()
    const p = await createProfile(world, { userId: owner.id })

    await log(as(world, owner), p.id, { count: 100 })
    expect(await setDay(as(world, owner), p.id, TODAY, 0)).toEqual({ loggedOn: TODAY, count: 0 })

    const result = await summary(as(world, owner), p.id, {})
    expect(result.days).toEqual([])
    expect(result.lifetime).toBe(0)
  })

  it('refuses a future day', async () => {
    world = await createTestSchool()
    const p = await createProfile(world, { userId: owner.id })

    await expect(setDay(as(world, owner), p.id, '2999-01-01', 5)).rejects.toMatchObject({
      statusCode: 422,
    })
  })
})

describe('summary', () => {
  it('reports the window and the lifetime separately, days newest first', async () => {
    world = await createTestSchool()
    const p = await createProfile(world, { userId: owner.id })
    for (const [loggedOn, count] of [
      ['2024-12-31', 1000],
      ['2025-01-01', 200],
      ['2025-06-15', 30],
      ['2026-01-01', 4],
    ] as const) {
      await log(as(world, owner), p.id, { count, loggedOn })
    }

    const year2025 = await summary(as(world, owner), p.id, { from: '2025-01-01', to: '2025-12-31' })
    expect(year2025.total).toBe(230)
    expect(year2025.lifetime).toBe(1234)
    expect(year2025.days.map(d => d.loggedOn)).toEqual(['2025-06-15', '2025-01-01'])

    const everything = await summary(as(world, owner), p.id, {})
    expect(everything.total).toBe(1234)
    expect(everything.days.map(d => d.loggedOn)).toEqual([
      '2026-01-01',
      '2025-06-15',
      '2025-01-01',
      '2024-12-31',
    ])
  })

  it("carries the student's today, and reads zero for someone who has never logged", async () => {
    world = await createTestSchool()
    const p = await createProfile(world, {
      userId: owner.id,
      countryTimeZone: 'Pacific/Kiritimati',
    })

    expect(await summary(as(world, owner), p.id, {})).toEqual({
      today: todayIn('Pacific/Kiritimati'),
      total: 0,
      lifetime: 0,
      days: [],
    })
  })

  it('404s a profile that does not exist', async () => {
    world = await createTestSchool()

    await expect(summary(as(world, owner), crypto.randomUUID(), {})).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})
