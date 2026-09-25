import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDbClient } from '@narada/db'

import type { User } from '../session'
import type { AccessPolicy } from '../utils/accessPolicy'
import * as repository from './repository'
import { log, setDay, summary } from './service'

// Explicit factories so neither the real repository (which pulls in `@narada/db`) nor `@narada/db`
// itself loads — that would trigger real env-var validation.
vi.mock('./repository', () => ({
  findLoggableProfile: vi.fn(),
  addToDay: vi.fn(),
  setDay: vi.fn(),
  summarize: vi.fn(),
}))
vi.mock('@narada/db', () => ({ COUNTER_DAILY_MAX: 1_000_000 }))

const db = {} as SchoolDbClient
const user = { id: 'user-1', isSchoolAdmin: false } as unknown as User

function access(isSchoolAdmin: boolean): AccessPolicy {
  return { isSchoolAdmin: () => isSchoolAdmin } as unknown as AccessPolicy
}

// SLMTS's Vedam course (`ved`) is the one that keeps a `japam` counter.
const ved = { db, school: { slug: 'slmts' }, course: { id: 'course-ved', slug: 'ved' } }
const own = { ...ved, user, access: access(false) }
const admin = { ...ved, user, access: access(true) }
const scope = { profileId: 'p1', courseId: 'course-ved', counterKey: 'japam' }

// 2026-03-01 20:00 UTC: already the 2nd in Kolkata, still the 1st in New York.
const NOW = new Date('2026-03-01T20:00:00Z')

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('a counter the course does not keep', () => {
  const cases = {
    'a school with none (RR)': { ...own, school: { slug: 'rr' }, course: { id: 'c', slug: 'pur' } },
    'another course in the same school': { ...own, course: { id: 'c', slug: 'other' } },
  }

  for (const [name, context] of Object.entries(cases)) {
    it(`is no such resource in ${name}: every operation 404s before touching the database`, async () => {
      await expect(summary(context, 'p1', 'japam', {})).rejects.toMatchObject({ statusCode: 404 })
      await expect(log(context, 'p1', 'japam', { count: 108 })).rejects.toMatchObject({
        statusCode: 404,
      })
      await expect(setDay(context, 'p1', 'japam', '2026-03-01', 5)).rejects.toMatchObject({
        statusCode: 404,
      })
      expect(repository.findLoggableProfile).not.toHaveBeenCalled()
    })
  }

  it('404s a key the course does not define', async () => {
    await expect(log(own, 'p1', 'parayanam', { count: 1 })).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(repository.findLoggableProfile).not.toHaveBeenCalled()
  })
})

describe('summary', () => {
  it("returns the totals with the student's own today, for this course's counter", async () => {
    vi.mocked(repository.findLoggableProfile).mockResolvedValue({ countryTimeZone: 'Asia/Kolkata' })
    vi.mocked(repository.summarize).mockResolvedValue({
      total: 216,
      lifetime: 1080,
      days: [{ loggedOn: '2026-03-02', count: 216 }],
    })

    await expect(summary(ved, 'p1', 'japam', { from: '2026-01-01' })).resolves.toEqual({
      today: '2026-03-02',
      total: 216,
      lifetime: 1080,
      days: [{ loggedOn: '2026-03-02', count: 216 }],
    })
    // Viewing was authorised by the route, so no owner predicate here.
    expect(repository.findLoggableProfile).toHaveBeenCalledWith(db, 'p1', null)
    expect(repository.summarize).toHaveBeenCalledWith(db, scope, { from: '2026-01-01' })
  })

  it('404s a missing or deactivated profile', async () => {
    vi.mocked(repository.findLoggableProfile).mockResolvedValue(undefined)
    await expect(summary(ved, 'p1', 'japam', {})).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('log', () => {
  it("adds to the student's today, scoped to the caller as owner and to this course", async () => {
    vi.mocked(repository.findLoggableProfile).mockResolvedValue({ countryTimeZone: 'Asia/Kolkata' })
    vi.mocked(repository.addToDay).mockResolvedValue({ loggedOn: '2026-03-02', count: 108 })

    await expect(log(own, 'p1', 'japam', { count: 108 })).resolves.toEqual({
      loggedOn: '2026-03-02',
      count: 108,
    })
    expect(repository.findLoggableProfile).toHaveBeenCalledWith(db, 'p1', 'user-1')
    expect(repository.addToDay).toHaveBeenCalledWith(db, scope, '2026-03-02', 108)
  })

  it("uses the profile's time zone, so the same instant is a different day elsewhere", async () => {
    vi.mocked(repository.findLoggableProfile).mockResolvedValue({
      countryTimeZone: 'America/New_York',
    })
    vi.mocked(repository.addToDay).mockResolvedValue({ loggedOn: '2026-03-01', count: 1 })

    await log(own, 'p1', 'japam', { count: 1 })

    expect(repository.addToDay).toHaveBeenCalledWith(db, scope, '2026-03-01', 1)
  })

  it('accepts a past day, for a sitting that was forgotten', async () => {
    vi.mocked(repository.findLoggableProfile).mockResolvedValue({ countryTimeZone: 'Asia/Kolkata' })
    vi.mocked(repository.addToDay).mockResolvedValue({ loggedOn: '2026-02-20', count: 54 })

    await log(own, 'p1', 'japam', { count: 54, loggedOn: '2026-02-20' })

    expect(repository.addToDay).toHaveBeenCalledWith(db, scope, '2026-02-20', 54)
  })

  it("refuses a future day, judged by the student's own today", async () => {
    vi.mocked(repository.findLoggableProfile).mockResolvedValue({
      countryTimeZone: 'America/New_York',
    })

    // The 2nd is already here in Kolkata but is still tomorrow in New York.
    await expect(
      log(own, 'p1', 'japam', { count: 1, loggedOn: '2026-03-02' }),
    ).rejects.toMatchObject({
      statusCode: 422,
    })
    expect(repository.addToDay).not.toHaveBeenCalled()
  })

  it('lets a school admin log for anyone, with no owner check', async () => {
    vi.mocked(repository.findLoggableProfile).mockResolvedValue({ countryTimeZone: null })
    vi.mocked(repository.addToDay).mockResolvedValue({ loggedOn: '2026-03-01', count: 10 })

    await log(admin, 'p1', 'japam', { count: 10 })

    expect(repository.findLoggableProfile).toHaveBeenCalledWith(db, 'p1', null)
  })

  it("404s someone else's profile for a non-admin, and writes nothing", async () => {
    vi.mocked(repository.findLoggableProfile).mockResolvedValue(undefined)

    await expect(log(own, 'p1', 'japam', { count: 1 })).rejects.toMatchObject({ statusCode: 404 })
    expect(repository.addToDay).not.toHaveBeenCalled()
  })

  it("turns the database's daily-cap violation into a 422", async () => {
    vi.mocked(repository.findLoggableProfile).mockResolvedValue({ countryTimeZone: null })
    vi.mocked(repository.addToDay).mockRejectedValue(
      Object.assign(new Error('violates check'), {
        code: '23514',
        constraint: 'counterLog_count_valid',
      }),
    )

    await expect(log(own, 'p1', 'japam', { count: 1 })).rejects.toMatchObject({
      statusCode: 422,
      message: "a day's count can't exceed 1000000",
    })
  })
})

describe('setDay', () => {
  it("sets a past day's total outright", async () => {
    vi.mocked(repository.findLoggableProfile).mockResolvedValue({ countryTimeZone: 'Asia/Kolkata' })
    vi.mocked(repository.setDay).mockResolvedValue({ loggedOn: '2026-02-20', count: 30 })

    await expect(setDay(own, 'p1', 'japam', '2026-02-20', 30)).resolves.toEqual({
      loggedOn: '2026-02-20',
      count: 30,
    })
    expect(repository.findLoggableProfile).toHaveBeenCalledWith(db, 'p1', 'user-1')
    expect(repository.setDay).toHaveBeenCalledWith(db, scope, '2026-02-20', 30)
  })

  it('refuses a future day', async () => {
    vi.mocked(repository.findLoggableProfile).mockResolvedValue({
      countryTimeZone: 'America/New_York',
    })

    await expect(setDay(own, 'p1', 'japam', '2026-03-02', 5)).rejects.toMatchObject({
      statusCode: 422,
    })
    expect(repository.setDay).not.toHaveBeenCalled()
  })

  it("404s someone else's profile for a non-admin", async () => {
    vi.mocked(repository.findLoggableProfile).mockResolvedValue(undefined)

    await expect(setDay(own, 'p1', 'japam', '2026-02-20', 5)).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})
