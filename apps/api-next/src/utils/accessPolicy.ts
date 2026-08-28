import {
  enrollment,
  member,
  organization,
  publicDb,
  type SchoolDbClient,
  type SchoolProfile,
} from '@narada/db'
import { hasBatchPermission as roleHasBatchPermission, type BatchPermissions } from '@narada/auth/permissions'

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
    private readonly batchRoles: Map<string, BatchRole>,
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
    const [membership, batchRoleRows] = await Promise.all([
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
      new Map(batchRoleRows.map(row => [row.batchId, row.role])),
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

  /**
   * Whether the actor's own enrollment role in `batchId` (if any — not the school-admin bypass,
   * callers combine that separately via `isSchoolAdmin()`) satisfies `permission`. The single
   * choke point for per-batch permission checks so new domains (exams, evaluations) ask this
   * instead of re-deriving "find my role in this batch, then check it" themselves.
   */
  public hasBatchPermission(batchId: string, permission: BatchPermissions): boolean {
    const role = this.batchRoles.get(batchId)
    return role !== undefined && roleHasBatchPermission(role, permission)
  }

  // -- Batches --------------------------------------------------------------

  public requireCanReadBatch(batchId: string): void {
    if (this.isSchoolAdmin() || this.hasBatchPermission(batchId, BATCH_READ_PERMISSION)) {
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
  // TODO: instructor/TA exam authorization — `enrollment/service.ts::resolveQualifyingBatch`
  // now resolves a student's batch from a chapter (shared with exam creation, DD-012), and
  // `hasBatchPermission` above is ready to check the actor's role in that batch. These methods
  // just haven't been switched over to use them yet; until then they stay school-admin-only
  // (plus self-read for students).

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

  // -- Profiles ---------------------------------------------------------------

  /** Admin-deactivation (DD-011 §9): only a school admin/owner (or super admin) may deactivate a profile other than their own. */
  public requireCanDeactivateProfile(): void {
    if (!this.isSchoolAdmin()) {
      throw forbidden()
    }
  }

  private requireProfileId(): string {
    if (!this.profileId) {
      throw forbidden('X-Profile-Id header is required')
    }

    return this.profileId
  }
}

// DD-010 (approved 2026-08-28): a *missing* membership row is not this function's concern — it's
// already rejected in `load()` before this runs, except for a super admin, for whom the return
// value here is never actually consulted (isSchoolAdmin()/requireSchoolMember() both short-circuit
// on isSuperAdmin first). A *present* role value outside owner/admin/member fails closed instead
// of being silently downgraded to `member` — the old backend already fails closed here
// structurally (BetterAuth's hasPermission has no matching statement for an unrecognized role),
// so this matches parity rather than deviating from it.
function normalizeSchoolRole(role: typeof member.$inferSelect.role | undefined): SchoolRole {
  if (role === undefined || role === 'owner' || role === 'admin' || role === 'member') {
    return role ?? 'member'
  }

  throw forbidden()
}
