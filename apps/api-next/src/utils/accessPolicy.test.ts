import { beforeEach, describe, expect, it, vi } from 'vitest'

// Explicit factory (rather than vitest's auto-mock) so the real `@narada/db` — which validates
// environment variables at import time — never loads.
vi.mock('@narada/db', () => ({
  enrollment: {},
  member: {},
  organization: {},
  publicDb: { query: { member: { findFirst: vi.fn() } } },
}))

import { publicDb, type SchoolDbClient, type SchoolProfile } from '@narada/db'

import { AccessPolicy } from './accessPolicy'
import type { User } from '../session'

const school = { id: 'school-1' } as Parameters<typeof AccessPolicy.load>[0]['school']

function schoolDbWithEnrollments(rows: { batchId: string; role: string }[]): SchoolDbClient {
  return {
    query: { enrollment: { findMany: vi.fn().mockResolvedValue(rows) } },
  } as unknown as SchoolDbClient
}

function user(overrides: Partial<User> = {}): User {
  return { id: 'user-1', isSuperAdmin: false, ...overrides } as User
}

// The real query returns a full `member` row; these tests only care about `role`.
function mockMembership(role: string | undefined) {
  vi.mocked(publicDb.query.member.findFirst).mockResolvedValue(
    role === undefined ? undefined : ({ role } as never),
  )
}

const profile = { id: 'profile-1' } as SchoolProfile

beforeEach(() => {
  vi.resetAllMocks()
})

describe('AccessPolicy.load / normalizeSchoolRole (DD-010)', () => {
  it('rejects a caller with no membership row and no super-admin flag', async () => {
    mockMembership(undefined)

    await expect(
      AccessPolicy.load({ db: schoolDbWithEnrollments([]), school, user: user() }),
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('accepts a super admin with no membership row', async () => {
    mockMembership(undefined)

    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user({ isSuperAdmin: true }),
    })

    expect(access.isSchoolAdmin()).toBe(true)
  })

  it.each(['owner', 'admin', 'member'] as const)(
    'accepts a recognized school role %s',
    async role => {
      mockMembership(role)

      const access = await AccessPolicy.load({
        db: schoolDbWithEnrollments([]),
        school,
        user: user(),
      })

      expect(access.isSchoolAdmin()).toBe(role === 'owner' || role === 'admin')
    },
  )

  it('fails closed (403) on a present but unrecognized role value, rather than downgrading to member', async () => {
    mockMembership('some-future-role')

    await expect(
      AccessPolicy.load({ db: schoolDbWithEnrollments([]), school, user: user() }),
    ).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('AccessPolicy#hasBatchPermission / requireCanReadBatch', () => {
  it('grants a batch permission the actor\'s own enrollment role satisfies', async () => {
    mockMembership('member')

    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([{ batchId: 'batch-1', role: 'instructor' }]),
      school,
      user: user(),
      profile,
    })

    expect(access.hasBatchPermission('batch-1', { enrollment: ['read'] })).toBe(true)
    expect(() => access.requireCanReadBatch('batch-1')).not.toThrow()
  })

  it('denies a batch the actor has no enrollment role in', async () => {
    mockMembership('member')

    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([{ batchId: 'batch-1', role: 'instructor' }]),
      school,
      user: user(),
      profile,
    })

    expect(access.hasBatchPermission('batch-2', { enrollment: ['read'] })).toBe(false)
    expect(() => access.requireCanReadBatch('batch-2')).toThrow()
  })

  it('a school admin can read any batch regardless of enrollment role', async () => {
    mockMembership('admin')

    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
    })

    expect(() => access.requireCanReadBatch('batch-1')).not.toThrow()
  })
})
