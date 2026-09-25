import { beforeEach, describe, expect, it, vi } from 'vitest'

// Explicit factory (rather than vitest's auto-mock) so the real `@narada/db` — which validates
// environment variables at import time — never loads.
vi.mock('@narada/db', () => ({
  enrollment: {},
  member: {},
  organization: {},
  publicDb: { query: { member: { findFirst: vi.fn() } } },
}))

// accessPolicy.ts imports this as a value for getProfileBatchListScope; mocked (rather than
// letting the real enrollment/repository.ts run) so it never needs a real Drizzle `db`.
vi.mock('../enrollment/service', () => ({
  hasSharedInstructorEnrollment: vi.fn(),
  isEnrolledInAnyBatch: vi.fn(),
}))

// The one course-membership query the content gate makes; its own behaviour is covered against a
// real database in courses/contentGate.integration.test.ts.
vi.mock('../courses/repository', () => ({
  isProfilePartOfCourse: vi.fn(),
}))

import { publicDb, type SchoolDbClient, type SchoolProfile } from '@narada/db'

import * as courseRepository from '../courses/repository'

import { AccessPolicy } from './accessPolicy'
import * as enrollmentService from '../enrollment/service'
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

describe('AccessPolicy#hasBatchPermission', () => {
  it("grants a batch permission the actor's own enrollment role satisfies", async () => {
    mockMembership('member')

    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([{ batchId: 'batch-1', role: 'instructor' }]),
      school,
      user: user(),
      profile,
    })

    expect(access.hasBatchPermission('batch-1', { enrollment: ['read'] })).toBe(true)
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

describe('AccessPolicy — exams', () => {
  const examOf = (studentId: string) => ({ studentId }) as Exam

  // Which batches each student is enrolled in, as `isEnrolledInAnyBatch` would answer it.
  const enrolledIn: Record<string, string[]> = {
    'student-in-batch-1': ['batch-1'],
    'student-in-batch-2': ['batch-2'],
    'student-in-none': [],
  }

  beforeEach(() => {
    vi.mocked(enrollmentService.isEnrolledInAnyBatch).mockImplementation(
      async (_db, studentId, batchIds) => (enrolledIn[studentId] ?? []).some(b => batchIds.includes(b)),
    )
  })

  it('getExamVisibility returns "all" for a school admin with no active profile', async () => {
    mockMembership('admin')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
    })

    expect(access.getExamVisibility()).toEqual({ kind: 'all' })
  })

  it('getExamVisibility denies a plain member with no active profile (no school evaluation:read)', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
    })

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

  it('getOwnExamScope always returns "own", even for a profile that also manages a batch', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([
        { batchId: 'batch-1', role: 'instructor' },
        { batchId: 'batch-2', role: 'ta' },
      ]),
      school,
      user: user(),
      profile,
    })

    // The point of this method (apps/web's "Sitting history" sends `mine=true` for it): a profile
    // who is *also* a TA/instructor elsewhere must still get only their own sittings here, unlike
    // getExamVisibility above, which would widen this same profile to 'manageable'.
    expect(access.getOwnExamScope()).toEqual({ kind: 'own', profileId: 'profile-1' })
  })

  it('getOwnExamScope throws without an active profile, even for a school admin or super admin', async () => {
    mockMembership('admin')
    const admin = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
    })
    expect(() => admin.getOwnExamScope()).toThrow()

    mockMembership('member')
    const superAdmin = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user({ isSuperAdmin: true }),
    })
    expect(() => superAdmin.getOwnExamScope()).toThrow()
  })

  it('requireCanCreateExam is school-admin (or super-admin) only — a batch instructor/TA role does not grant it', async () => {
    mockMembership('member')
    const instructorAccess = await AccessPolicy.load({
      db: schoolDbWithEnrollments([{ batchId: 'batch-1', role: 'instructor' }]),
      school,
      user: user(),
      profile,
    })
    expect(() => instructorAccess.requireCanCreateExam()).toThrow()

    mockMembership('admin')
    const adminAccess = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
      profile,
    })
    expect(() => adminAccess.requireCanCreateExam()).not.toThrow()

    mockMembership('member')
    const superAdminAccess = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user({ isSuperAdmin: true }),
      profile,
    })
    expect(() => superAdminAccess.requireCanCreateExam()).not.toThrow()
  })

  it('requireCanUpdateExam gates on exam:update in a batch the student is in (instructor/TA, not a student)', async () => {
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

    await expect(access.requireCanUpdateExam(examOf('student-in-batch-1'))).resolves.toBeUndefined()
    // students hold exam:read, not exam:update, in their own batch
    await expect(access.requireCanUpdateExam(examOf('student-in-batch-2'))).rejects.toThrow()
  })

  it('requireCanUpdateExam has no school-admin fallback — a plain owner/admin needs their own batch exam:update role', async () => {
    mockMembership('owner')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
      profile,
    })

    await expect(access.requireCanUpdateExam(examOf('student-in-batch-1'))).rejects.toThrow()
  })

  it('requireCanUpdateExam allows a super admin for any student', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user({ isSuperAdmin: true }),
      profile,
    })

    await expect(access.requireCanUpdateExam(examOf('student-in-none'))).resolves.toBeUndefined()
  })

  it('requireCanRecordEvaluation is school-admin only — an instructor/TA can update the exam but not certify a result', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([
        { batchId: 'batch-1', role: 'instructor' },
        { batchId: 'batch-2', role: 'ta' },
      ]),
      school,
      user: user(),
      profile,
    })

    expect(() => access.requireCanRecordEvaluation()).toThrow()
  })

  it.each(['owner', 'admin'] as const)(
    'requireCanRecordEvaluation allows a school %s regardless of their own batch role',
    async role => {
      mockMembership(role)
      const access = await AccessPolicy.load({
        db: schoolDbWithEnrollments([]),
        school,
        user: user(),
        profile,
      })

      expect(() => access.requireCanRecordEvaluation()).not.toThrow()
    },
  )

  it('requireCanRecordEvaluation allows a super admin', async () => {
    mockMembership(undefined)
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user({ isSuperAdmin: true }),
    })

    expect(() => access.requireCanRecordEvaluation()).not.toThrow()
  })
})

describe('AccessPolicy — exam slot requests', () => {
  it('getExamSlotRequestVisibility returns "all" for a school admin, "own" for anyone else — never widened by a batch role', async () => {
    mockMembership('admin')
    const adminAccess = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
      profile,
    })
    expect(adminAccess.getExamSlotRequestVisibility()).toEqual({ kind: 'all' })

    mockMembership('member')
    const instructorAccess = await AccessPolicy.load({
      db: schoolDbWithEnrollments([{ batchId: 'batch-1', role: 'instructor' }]),
      school,
      user: user(),
      profile,
    })
    expect(instructorAccess.getExamSlotRequestVisibility()).toEqual({
      kind: 'own',
      profileId: 'profile-1',
    })
  })

  it('getExamSlotRequestVisibility throws for a caller with no active profile and no school-admin role', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
    })

    expect(() => access.getExamSlotRequestVisibility()).toThrow()
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

  it('requireCanCreateEvaluation allows a school admin, a super admin, or a batch evaluation:create role', async () => {
    mockMembership('admin')
    const adminAccess = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
      profile,
    })
    expect(() => adminAccess.requireCanCreateEvaluation('batch-1')).not.toThrow()

    mockMembership('member')
    const plainMemberAccess = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
      profile,
    })
    expect(() => plainMemberAccess.requireCanCreateEvaluation('batch-1')).toThrow()

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

describe('AccessPolicy#getCourseVisibility', () => {
  it('lets a school admin pick from every course, with or without an active profile', async () => {
    mockMembership('admin')

    const withoutProfile = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
    })
    const withProfile = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
      profile,
    })

    expect(withoutProfile.getCourseVisibility()).toEqual({ kind: 'all' })
    expect(withProfile.getCourseVisibility()).toEqual({ kind: 'all' })
  })

  it("limits anyone else to their own profile's courses", async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
      profile,
    })

    expect(access.getCourseVisibility()).toEqual({ kind: 'ofProfile', profileId: 'profile-1' })
  })

  it('has nothing to offer a non-admin with no active profile, rather than guessing', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
    })

    expect(() => access.getCourseVisibility()).toThrow()
  })
})

describe('AccessPolicy#requireCanSearchProfiles', () => {
  it('allows a school admin, denies a plain member', async () => {
    mockMembership('admin')
    const adminAccess = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
    })
    expect(() => adminAccess.requireCanSearchProfiles()).not.toThrow()

    mockMembership('member')
    const memberAccess = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
    })
    expect(() => memberAccess.requireCanSearchProfiles()).toThrow()
  })
})

describe('AccessPolicy#getProfileBatchListScope (corrected 2026-08-28)', () => {
  it("a self-lookup by a school admin gets 'all'; a self-lookup by an ordinary member gets 'enrolled'", async () => {
    mockMembership('admin')
    const adminAccess = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
      profile,
    })
    await expect(adminAccess.getProfileBatchListScope('profile-1')).resolves.toEqual({
      kind: 'all',
    })

    mockMembership('member')
    const memberAccess = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
      profile,
    })
    await expect(memberAccess.getProfileBatchListScope('profile-1')).resolves.toEqual({
      kind: 'enrolled',
      profileId: 'profile-1',
    })
  })

  it("a lookup of a DIFFERENT profile by a school admin is scoped to that profile's own enrollments, never 'all'", async () => {
    mockMembership('admin')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
      profile,
    })

    await expect(access.getProfileBatchListScope('someone-else')).resolves.toEqual({
      kind: 'enrolled',
      profileId: 'someone-else',
    })
  })

  it("a super admin looking up a different profile is also scoped, never 'all'", async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user({ isSuperAdmin: true }),
      profile,
    })

    await expect(access.getProfileBatchListScope('someone-else')).resolves.toEqual({
      kind: 'enrolled',
      profileId: 'someone-else',
    })
  })

  it('a shared-instructor lookup of a different profile is granted, scoped to the target', async () => {
    mockMembership('member')
    vi.mocked(enrollmentService.hasSharedInstructorEnrollment).mockResolvedValue(true)
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([{ batchId: 'batch-1', role: 'instructor' }]),
      school,
      user: user(),
      profile,
    })

    await expect(access.getProfileBatchListScope('someone-else')).resolves.toEqual({
      kind: 'enrolled',
      profileId: 'someone-else',
    })
    expect(enrollmentService.hasSharedInstructorEnrollment).toHaveBeenCalledWith(
      expect.anything(),
      'profile-1',
      'someone-else',
    )
  })

  it('denies a lookup of a different profile with no admin status and no shared history', async () => {
    mockMembership('member')
    vi.mocked(enrollmentService.hasSharedInstructorEnrollment).mockResolvedValue(false)
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([{ batchId: 'batch-1', role: 'student' }]),
      school,
      user: user(),
      profile,
    })

    await expect(access.getProfileBatchListScope('someone-else')).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('denies a lookup of a different profile when the caller has no active profile at all', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
    })

    await expect(access.getProfileBatchListScope('someone-else')).rejects.toMatchObject({
      statusCode: 403,
    })
    expect(enrollmentService.hasSharedInstructorEnrollment).not.toHaveBeenCalled()
  })
})

describe('AccessPolicy#requireCanViewProfile', () => {
  it('allows a self-lookup even with no admin status and no shared history', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
      profile,
    })

    await expect(access.requireCanViewProfile('profile-1')).resolves.toBeUndefined()
    expect(enrollmentService.hasSharedInstructorEnrollment).not.toHaveBeenCalled()
  })

  it('allows a school admin to view any profile', async () => {
    mockMembership('admin')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
      profile,
    })

    await expect(access.requireCanViewProfile('someone-else')).resolves.toBeUndefined()
    expect(enrollmentService.hasSharedInstructorEnrollment).not.toHaveBeenCalled()
  })

  it('allows a teacher who shares a batch with the target profile', async () => {
    mockMembership('member')
    vi.mocked(enrollmentService.hasSharedInstructorEnrollment).mockResolvedValue(true)
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([{ batchId: 'batch-1', role: 'instructor' }]),
      school,
      user: user(),
      profile,
    })

    await expect(access.requireCanViewProfile('someone-else')).resolves.toBeUndefined()
    expect(enrollmentService.hasSharedInstructorEnrollment).toHaveBeenCalledWith(
      expect.anything(),
      'profile-1',
      'someone-else',
    )
  })

  it('denies a stranger — no self-match, no admin status, no shared history', async () => {
    mockMembership('member')
    vi.mocked(enrollmentService.hasSharedInstructorEnrollment).mockResolvedValue(false)
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([{ batchId: 'batch-1', role: 'student' }]),
      school,
      user: user(),
      profile,
    })

    await expect(access.requireCanViewProfile('someone-else')).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('denies a lookup of a different profile when the caller has no active profile at all', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
    })

    await expect(access.requireCanViewProfile('someone-else')).rejects.toMatchObject({
      statusCode: 403,
    })
    expect(enrollmentService.hasSharedInstructorEnrollment).not.toHaveBeenCalled()
  })
})

describe('AccessPolicy#getContentReadView', () => {
  it('a school admin gets the authoring view', async () => {
    mockMembership('admin')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
    })

    expect(access.getContentReadView()).toEqual({ kind: 'authoring' })
  })

  it('an ordinary member gets the learner-preview view, not authoring', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
    })

    expect(access.getContentReadView()).toEqual({ kind: 'learnerPreview' })
  })

  it('a super admin gets the authoring view', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user({ isSuperAdmin: true }),
    })

    expect(access.getContentReadView()).toEqual({ kind: 'authoring' })
  })
})

describe('AccessPolicy#requireCanUpdateContent', () => {
  it('a school admin may update content', async () => {
    mockMembership('admin')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
    })

    expect(() => access.requireCanUpdateContent()).not.toThrow()
  })

  it('an ordinary member may not update content', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
    })

    expect(() => access.requireCanUpdateContent()).toThrow()
  })

  it('a super admin may update content', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user({ isSuperAdmin: true }),
    })

    expect(() => access.requireCanUpdateContent()).not.toThrow()
  })
})

describe('AccessPolicy#canReadCourseContent / requireCanReadCourseContent', () => {
  it('a school admin may read any course’s content without a membership lookup', async () => {
    mockMembership('admin')
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
      profile,
    })

    await expect(access.canReadCourseContent('course-1')).resolves.toBe(true)
    expect(courseRepository.isProfilePartOfCourse).not.toHaveBeenCalled()
  })

  it('an admin with no active profile may still read', async () => {
    mockMembership('owner')
    const access = await AccessPolicy.load({ db: schoolDbWithEnrollments([]), school, user: user() })

    await expect(access.canReadCourseContent('course-1')).resolves.toBe(true)
  })

  it('a member reads exactly the courses their profile is part of', async () => {
    mockMembership('member')
    vi.mocked(courseRepository.isProfilePartOfCourse).mockImplementation(
      async (_db, _profileId, courseId) => courseId === 'mine',
    )
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
      profile,
    })

    await expect(access.canReadCourseContent('mine')).resolves.toBe(true)
    await expect(access.canReadCourseContent('theirs')).resolves.toBe(false)
    expect(courseRepository.isProfilePartOfCourse).toHaveBeenCalledWith(
      expect.anything(),
      'profile-1',
      'theirs',
    )
  })

  it('a member with no active profile is part of nothing', async () => {
    mockMembership('member')
    const access = await AccessPolicy.load({ db: schoolDbWithEnrollments([]), school, user: user() })

    await expect(access.canReadCourseContent('course-1')).resolves.toBe(false)
    expect(courseRepository.isProfilePartOfCourse).not.toHaveBeenCalled()
  })

  it('requireCanReadCourseContent is a 403 for a course the caller is not part of', async () => {
    mockMembership('member')
    vi.mocked(courseRepository.isProfilePartOfCourse).mockResolvedValue(false)
    const access = await AccessPolicy.load({
      db: schoolDbWithEnrollments([]),
      school,
      user: user(),
      profile,
    })

    await expect(access.requireCanReadCourseContent('course-1')).rejects.toMatchObject({
      statusCode: 403,
    })
  })
})
