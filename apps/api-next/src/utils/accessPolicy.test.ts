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
import type { Exam } from '../exams/schema'

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

describe('AccessPolicy — enrollment (batch roster)', () => {
  it('an instructor can create and remove enrollments in their own batch, but not another', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([{ batchId: 'batch-1', role: 'instructor' }]),
      school,
      user: user(),
      profile,
    })

    expect(() => access.requireCanCreateEnrollment('batch-1')).not.toThrow()
    expect(() => access.requireCanRemoveEnrollment('batch-1')).not.toThrow()
    expect(() => access.requireCanCreateEnrollment('batch-2')).toThrow()
    expect(() => access.requireCanRemoveEnrollment('batch-2')).toThrow()
  })

  it('a TA or student cannot create or remove enrollments, even in their own batch', async () => {
    mockMembership('member')
    const taAccess = await AccessPolicy.load({
      db: schoolDbWithEnrollments([{ batchId: 'batch-1', role: 'ta' }]),
      school,
      user: user(),
      profile,
    })
    expect(() => taAccess.requireCanCreateEnrollment('batch-1')).toThrow()
    expect(() => taAccess.requireCanRemoveEnrollment('batch-1')).toThrow()

    mockMembership('member')
    const studentAccess = await AccessPolicy.load({
      db: schoolDbWithEnrollments([{ batchId: 'batch-1', role: 'student' }]),
      school,
      user: user(),
      profile,
    })
    expect(() => studentAccess.requireCanCreateEnrollment('batch-1')).toThrow()
    expect(() => studentAccess.requireCanRemoveEnrollment('batch-1')).toThrow()
  })

  it('a school admin can manage enrollment in any batch, unconditionally', async () => {
    mockMembership('admin')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
    })

    expect(() => access.requireCanCreateEnrollment('batch-1')).not.toThrow()
    expect(() => access.requireCanRemoveEnrollment('batch-1')).not.toThrow()
  })
})

describe('AccessPolicy — exams (DD-003/DD-005/DD-006)', () => {
  const examIn = (batchId: string | null, studentId = 'someone-else') =>
    ({ studentId, batchId }) as Exam

  it('getExamVisibility returns "all" for a school admin with no active profile', async () => {
    mockMembership('admin')
    const access = await AccessPolicy.load({ db: schoolDbWithEnrollments([]), school, user: user() })

    expect(access.getExamVisibility()).toEqual({ kind: 'all' })
  })

  it('getExamVisibility denies a plain member with no active profile (no school evaluation:read)', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({ db: schoolDbWithEnrollments([]), school, user: user() })

    expect(() => access.getExamVisibility()).toThrow()
  })

  it('getExamVisibility switches even a school admin to scoped visibility once a profile is supplied', async () => {
    mockMembership('admin')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([{ batchId: 'batch-1', role: 'instructor' }]),
      school,
      user: user(),
      profile,
    })

    // Admin status alone no longer grants 'all' once a profile is active — matches
    // apps/api/src/routes/exams.ts's `else if (profile) { scoped }` branch, which runs for a
    // school admin too (only isSuperAdmin skips it).
    expect(access.getExamVisibility()).toMatchObject({ kind: 'manageable', profileId: 'profile-1' })
  })

  it('getExamVisibility always returns "all" for a super admin, profile or not', async () => {
    mockMembership('member')
    const withProfile = await AccessPolicy.load({
      db: schoolDbWithEnrollments([{ batchId: 'batch-1', role: 'student' }]),
      school,
      user: user({ isSuperAdmin: true }),
      profile,
    })
    expect(withProfile.getExamVisibility()).toEqual({ kind: 'all' })

    mockMembership('member')
    const withoutProfile = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user({ isSuperAdmin: true }),
    })
    expect(withoutProfile.getExamVisibility()).toEqual({ kind: 'all' })
  })

  it('getExamVisibility returns "own" for a profile with no exam:read batch permission', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([{ batchId: 'batch-1', role: 'student' }]),
      school,
      user: user(),
      profile,
    })

    expect(access.getExamVisibility()).toEqual({ kind: 'own', profileId: 'profile-1' })
  })

  it('getExamVisibility returns "manageable" with every batch the actor holds exam:read in', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([
        { batchId: 'batch-1', role: 'instructor' },
        { batchId: 'batch-2', role: 'student' },
        { batchId: 'batch-3', role: 'ta' },
      ]),
      school,
      user: user(),
      profile,
    })

    const visibility = access.getExamVisibility()
    expect(visibility.kind).toBe('manageable')
    expect(visibility).toMatchObject({ profileId: 'profile-1' })
    expect((visibility as { batchIds: string[] }).batchIds.sort()).toEqual(['batch-1', 'batch-3'])
  })

  it('requireCanReadExam allows the exam\'s own student, an admin, or a manageable batch role', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([{ batchId: 'batch-1', role: 'instructor' }]),
      school,
      user: user(),
      profile,
    })

    expect(() => access.requireCanReadExam(examIn('batch-1'))).not.toThrow()
    expect(() => access.requireCanReadExam(examIn('batch-2', 'profile-1'))).not.toThrow()
    expect(() => access.requireCanReadExam(examIn('batch-2'))).toThrow()
    expect(() => access.requireCanReadExam(examIn(null))).toThrow()
  })

  it('requireCanCreateExam checks the resolved batchId, not the exam row (none exists yet)', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([{ batchId: 'batch-1', role: 'instructor' }]),
      school,
      user: user(),
      profile,
    })

    expect(() => access.requireCanCreateExam('batch-1')).not.toThrow()
    expect(() => access.requireCanCreateExam('batch-2')).toThrow()
  })

  it('requireCanCreateExam has no school-admin fallback — only super admin or a batch exam:create role', async () => {
    mockMembership('admin')
    const adminAccess = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
      profile,
    })
    expect(() => adminAccess.requireCanCreateExam('batch-1')).toThrow()

    mockMembership('member')
    const superAdminAccess = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user({ isSuperAdmin: true }),
      profile,
    })
    expect(() => superAdminAccess.requireCanCreateExam('batch-1')).not.toThrow()
  })

  it('requireCanUpdateExam and requireCanRecordEvaluation both gate on exam:update in the exam\'s batch', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([
        { batchId: 'batch-1', role: 'instructor' },
        { batchId: 'batch-2', role: 'student' },
      ]),
      school,
      user: user(),
      profile,
    })

    expect(() => access.requireCanUpdateExam(examIn('batch-1'))).not.toThrow()
    expect(() => access.requireCanRecordEvaluation(examIn('batch-1'))).not.toThrow()
    // students hold exam:read, not exam:update, in their own batch
    expect(() => access.requireCanUpdateExam(examIn('batch-2'))).toThrow()
  })

  it('requireCanUpdateExam has no school-admin fallback — a plain owner/admin needs their own batch exam:update role', async () => {
    mockMembership('owner')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
      profile,
    })

    expect(() => access.requireCanUpdateExam(examIn('batch-1'))).toThrow()
    expect(() => access.requireCanRecordEvaluation(examIn('batch-1'))).toThrow()
  })
})

describe('AccessPolicy — evaluations (§10.3–§10.5)', () => {
  it('requireCanReadBatchEvaluations allows a school admin or a batch evaluation:create role, denies a plain student', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([
        { batchId: 'batch-1', role: 'instructor' },
        { batchId: 'batch-2', role: 'student' },
      ]),
      school,
      user: user(),
      profile,
    })

    expect(() => access.requireCanReadBatchEvaluations('batch-1')).not.toThrow()
    expect(() => access.requireCanReadBatchEvaluations('batch-2')).toThrow()
  })

  it('requireCanReadStudentEvaluations: self needs evaluation:read, another student needs evaluation:create', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([{ batchId: 'batch-1', role: 'student' }]),
      school,
      user: user(),
      profile,
    })

    expect(() => access.requireCanReadStudentEvaluations('batch-1', 'profile-1')).not.toThrow()
    expect(() => access.requireCanReadStudentEvaluations('batch-1', 'someone-else')).toThrow()
  })

  it('requireCanCreateEvaluation has no school-admin fallback — only super admin or a batch evaluation:create role', async () => {
    mockMembership('admin')
    const adminAccess = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
      profile,
    })
    expect(() => adminAccess.requireCanCreateEvaluation('batch-1')).toThrow()

    mockMembership('member')
    const superAdminAccess = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user({ isSuperAdmin: true }),
      profile,
    })
    expect(() => superAdminAccess.requireCanCreateEvaluation('batch-1')).not.toThrow()

    mockMembership('member')
    const instructorAccess = await AccessPolicy.load({
      db: schoolDbWithEnrollments([{ batchId: 'batch-1', role: 'instructor' }]),
      school,
      user: user(),
      profile,
    })
    expect(() => instructorAccess.requireCanCreateEvaluation('batch-1')).not.toThrow()
  })
})
