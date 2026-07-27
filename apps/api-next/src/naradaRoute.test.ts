import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

// Explicit factory (rather than vitest's auto-mock) so the real `@narada/db` - which validates
// environment variables at import time - never loads.
vi.mock('@narada/db', () => ({
  publicDb: { query: { organization: { findFirst: vi.fn() } } },
  getSchoolDb: vi.fn(),
}))

// naradaRoute.ts imports SessionService as a value; the real module loads @narada/auth.
vi.mock('./session', () => ({
  SessionService: { getCurrentUser: vi.fn(), getSession: vi.fn() },
}))

// naradaRoute.ts imports AccessPolicy as a value, and the real module imports @narada/db.
// Unused by these tests but required for the import graph to resolve without loading @narada/db's
// real env validation via utils/accessPolicy.ts's value imports (member, organization, enrollment).
vi.mock('./utils/accessPolicy', () => ({
  AccessPolicy: { load: vi.fn() },
}))

import { getSchoolDb, publicDb } from '@narada/db'

import { unauthorized } from './error'
import { profileRoute, schoolRoute, userRoute } from './naradaRoute'
import { SessionService } from './session'

function makeRequest(slug?: string): Request {
  return {
    get: (name: string) => (name.toLowerCase() === 'x-school-slug' ? slug : undefined),
    headers: {},
  } as unknown as Request
}

const res = {} as Response
const next = (() => {}) as NextFunction

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(publicDb.query.organization.findFirst).mockResolvedValue({
    id: 'school-1',
    slug: 'known',
  } as never)
  vi.mocked(getSchoolDb).mockReturnValue({} as never)
  vi.mocked(SessionService.getCurrentUser).mockResolvedValue({ id: 'user-1' } as never)
})

describe('schoolRoute', () => {
  it('rejects a missing X-School-Slug header with 400, synchronously, with no session involved', async () => {
    const handler = vi.fn(async () => {})
    const req = makeRequest(undefined)

    await expect(schoolRoute(handler)(req, res, next)).rejects.toMatchObject({
      statusCode: 400,
      message: 'X-School-Slug header is required',
    })

    expect(publicDb.query.organization.findFirst).not.toHaveBeenCalled()
    expect(handler).not.toHaveBeenCalled()
  })

  it('throws a 404 (not 400) for an unknown school slug', async () => {
    vi.mocked(publicDb.query.organization.findFirst).mockResolvedValue(undefined as never)
    const handler = vi.fn(async () => {})

    await expect(
      schoolRoute(handler)(makeRequest('unknown'), res, next),
    ).rejects.toMatchObject({ statusCode: 404, message: 'school not found' })

    expect(handler).not.toHaveBeenCalled()
  })

  it('resolves the school at most once per request', async () => {
    const handler = vi.fn(async () => {})
    const req = makeRequest('known')

    await schoolRoute(handler)(req, res, next)
    await schoolRoute(handler)(req, res, next)

    expect(publicDb.query.organization.findFirst).toHaveBeenCalledTimes(1)

    const otherReq = makeRequest('known')
    await schoolRoute(handler)(otherReq, res, next)

    expect(publicDb.query.organization.findFirst).toHaveBeenCalledTimes(2)
  })
})

describe('userRoute', () => {
  it('returns 401 and never queries the school when the session is invalid', async () => {
    vi.mocked(SessionService.getCurrentUser).mockRejectedValue(unauthorized())
    // Make the school query artificially slow so an old racy `Promise.all` implementation would
    // still resolve the session rejection first only by luck - this proves ordering, not timing.
    vi.mocked(publicDb.query.organization.findFirst).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(undefined), 50)) as never,
    )
    const handler = vi.fn(async () => {})
    const req = makeRequest('unknown') // both conditions bad at once

    await expect(userRoute(handler)(req, res, next)).rejects.toMatchObject({ statusCode: 401 })

    // This is the assertion that would fail if the old `Promise.all` racy ordering regressed:
    // the school lookup must never fire once the session check has already failed.
    expect(publicDb.query.organization.findFirst).not.toHaveBeenCalled()
    expect(handler).not.toHaveBeenCalled()
  })

  it('rejects a missing X-School-Slug header with 400 and never looks up the session or school', async () => {
    vi.mocked(SessionService.getCurrentUser).mockRejectedValue(unauthorized())
    const handler = vi.fn(async () => {})
    const req = makeRequest(undefined)

    await expect(userRoute(handler)(req, res, next)).rejects.toMatchObject({
      statusCode: 400,
      message: 'X-School-Slug header is required',
    })

    expect(SessionService.getCurrentUser).not.toHaveBeenCalled()
    expect(publicDb.query.organization.findFirst).not.toHaveBeenCalled()
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown slug with a valid session', async () => {
    vi.mocked(publicDb.query.organization.findFirst).mockResolvedValue(undefined as never)
    const handler = vi.fn(async () => {})
    const req = makeRequest('unknown')

    await expect(userRoute(handler)(req, res, next)).rejects.toMatchObject({ statusCode: 404 })

    expect(SessionService.getCurrentUser).toHaveBeenCalledTimes(1)
    expect(handler).not.toHaveBeenCalled()
  })

  it('passes db, school, and user through to the handler on the happy path', async () => {
    const handler = vi.fn(async () => {})
    const req = makeRequest('known')

    await userRoute(handler)(req, res, next)

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        school: { id: 'school-1', slug: 'known' },
        user: { id: 'user-1' },
      }),
    )
  })
})

// profileRoute applies the identical requireSchoolSlug -> session -> resolveSchool ordering
// before its own resolveProfile/AccessPolicy.load steps (both mocked away here, since this PR's
// scope is the shared ordering fix, not profile/policy resolution itself).
describe('profileRoute', () => {
  it('rejects a missing X-School-Slug header with 400 and never looks up the session or school', async () => {
    vi.mocked(SessionService.getCurrentUser).mockRejectedValue(unauthorized())
    const handler = vi.fn(async () => {})
    const req = makeRequest(undefined)

    await expect(profileRoute(handler)(req, res, next)).rejects.toMatchObject({
      statusCode: 400,
      message: 'X-School-Slug header is required',
    })

    expect(SessionService.getCurrentUser).not.toHaveBeenCalled()
    expect(publicDb.query.organization.findFirst).not.toHaveBeenCalled()
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns 401 and never queries the school when the session is invalid', async () => {
    vi.mocked(SessionService.getCurrentUser).mockRejectedValue(unauthorized())
    vi.mocked(publicDb.query.organization.findFirst).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(undefined), 50)) as never,
    )
    const handler = vi.fn(async () => {})
    const req = makeRequest('unknown')

    await expect(profileRoute(handler)(req, res, next)).rejects.toMatchObject({ statusCode: 401 })

    expect(publicDb.query.organization.findFirst).not.toHaveBeenCalled()
    expect(handler).not.toHaveBeenCalled()
  })
})
