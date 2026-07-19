import {
  enrollment,
  member,
  organization,
  publicDb,
  type SchoolDbClient,
  type SchoolProfile,
} from '@narada/db'
import { hasBatchPermission, type BatchPermissions } from '@narada/auth/permissions'

import { forbidden } from '../error'
import type { Exam } from '../exams/schema'
import type { User } from '../session'

type School = typeof organization.$inferSelect
type SchoolRole = 'owner' | 'admin' | 'member'
type BatchRole = typeof enrollment.$inferSelect.role

// AccessPolicy is the single owner of the read-scope vocabulary; domain
// services accept these types as parameters rather than defining their own.
export type BatchReadScope = { kind: 'all' } | { kind: 'enrolled'; profileId: string }
// 'own' is everyone except school admins until batch-scoped visibility is
// wired up (see the exam TODO below).
export type ExamReadScope = { kind: 'all' } | { kind: 'own'; profileId: string }

type AccessPolicySource = {
  db: SchoolDbClient
  school: School
  user: User
  profile?: SchoolProfile
}

const BATCH_READ_PERMISSION: BatchPermissions = { enrollment: ['read'] }

/**
 * The single authorization vocabulary for domain services (HARDENING_PLAN.md §4.4). Holds an
 * actor's resolved school role and, if a profile is active, their per-batch roles, so a service
 * asks a typed `require*`/`get*Visibility` question instead of re-deriving permissions itself.
 */
export class AccessPolicy {
  private constructor(
    private readonly userId: string,
    private readonly profileId: string | null,
    private readonly schoolRole: SchoolRole,
    private readonly batchRoles: Array<{ batchId: string; role: BatchRole }>,
    private readonly isSuperAdmin: boolean,
  ) {}

  /**
   * Resolves the actor's school membership and (if a profile is active) their batch enrollments
   * in parallel. A non-super-admin with no organization membership is rejected here so every
   * other method can assume `schoolRole`/`batchRoles` are already authorized to view.
   */
  public static async load({
    db,
    school,
    user,
    profile,
  }: AccessPolicySource): Promise<AccessPolicy> {
    const [membership, batchRoles] = await Promise.all([
      publicDb.query.member.findFirst({
        where: (t, { and, eq }) => and(eq(t.organizationId, school.id), eq(t.userId, user.id)),
        columns: { role: true },
      }),
      profile
        ? db.query.enrollment.findMany({
            where: (t, { eq }) => eq(t.profileId, profile.id),
            columns: { batchId: true, role: true },
          })
        : Promise.resolve([]),
    ])

    if (!membership && !user.isSuperAdmin) {
      throw forbidden()
    }

    return new AccessPolicy(
      user.id,
      profile?.id ?? null,
      normalizeSchoolRole(membership?.role),
      batchRoles,
      user.isSuperAdmin,
    )
  }

  public requireSchoolMember(): void {
    if (this.isSuperAdmin || this.schoolRole) {
      return
    }

    throw forbidden()
  }

  public isSchoolAdmin(): boolean {
    return this.isSuperAdmin || this.schoolRole === 'owner' || this.schoolRole === 'admin'
  }

  // -- Batches --------------------------------------------------------------

  public requireCanReadBatch(batchId: string): void {
    if (this.isSchoolAdmin()) {
      return
    }

    const role = this.batchRoles.find(batchRole => batchRole.batchId === batchId)?.role
    if (role && hasBatchPermission(role, BATCH_READ_PERMISSION)) {
      return
    }

    throw forbidden()
  }

  public requireCanCreateBatch(): void {
    if (!this.isSchoolAdmin()) {
      throw forbidden()
    }
  }

  public requireCanUpdateBatch(_batchId: string): void {
    if (!this.isSchoolAdmin()) {
      throw forbidden()
    }
  }

  public getBatchVisibility(): BatchReadScope {
    if (this.isSchoolAdmin()) {
      return { kind: 'all' }
    }

    return { kind: 'enrolled', profileId: this.requireProfileId() }
  }

  // -- Exams ------------------------------------------------------------------
  // TODO: instructor/TA exam authorization needs to resolve a student's batch
  // from a chapter (see exams/service.ts:assertValidExamAssignment); until
  // that lands, these stay school-admin-only (plus self-read for students).

  public requireCanReadExam(exam: Exam): void {
    if (this.isSchoolAdmin() || exam.studentId === this.profileId) {
      return
    }

    throw forbidden()
  }

  public requireCanCreateExam(): void {
    if (!this.isSchoolAdmin()) {
      throw forbidden()
    }
  }

  public requireCanUpdateExam(_exam: Exam): void {
    if (!this.isSchoolAdmin()) {
      throw forbidden()
    }
  }

  public requireCanRecordEvaluation(_exam: Exam): void {
    if (!this.isSchoolAdmin()) {
      throw forbidden()
    }
  }

  public getExamVisibility(): ExamReadScope {
    if (this.isSchoolAdmin()) {
      return { kind: 'all' }
    }

    return { kind: 'own', profileId: this.requireProfileId() }
  }

  private requireProfileId(): string {
    if (!this.profileId) {
      throw forbidden('X-Profile-Id header is required')
    }

    return this.profileId
  }
}

// Compatibility baseline (PARITY_PLAN.md DD-010 is not yet approved): a missing or unrecognized
// role is normalized down to plain `member` rather than rejected. Do not change this to a
// fail-closed/deny behavior without that decision being approved first.
function normalizeSchoolRole(role: typeof member.$inferSelect.role | undefined): SchoolRole {
  if (role === 'owner' || role === 'admin') {
    return role
  }

  return 'member'
}
