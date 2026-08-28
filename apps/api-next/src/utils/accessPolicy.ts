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
// 'own' is a profile with no batch where they hold exam:read (e.g. a plain student) — every exam
// visible to them has studentId === profileId. 'manageable' adds every batch where they do hold
// exam:read (instructor/TA): studentId === profileId OR batchId is one of `batchIds`. `batchIds`
// is always non-empty for 'manageable' — an empty-permission actor gets 'own' instead, so
// repository code never has to special-case an empty SQL IN-list.
export type ExamReadScope =
  | { kind: 'all' }
  | { kind: 'own'; profileId: string }
  | { kind: 'manageable'; profileId: string; batchIds: string[] }

type AccessPolicySource = {
  db: SchoolDbClient
  school: School
  user: User
  profile?: SchoolProfile
}

const BATCH_READ_PERMISSION: BatchPermissions = { enrollment: ['read'] }
const EXAM_READ_PERMISSION: BatchPermissions = { exam: ['read'] }
const EXAM_CREATE_PERMISSION: BatchPermissions = { exam: ['create'] }
const EXAM_UPDATE_PERMISSION: BatchPermissions = { exam: ['update'] }

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

  /** Every batchId where the actor's own enrollment role satisfies `permission` — backs the
   * 'manageable' read scopes (e.g. `getExamVisibility`). */
  private batchIdsWithPermission(permission: BatchPermissions): string[] {
    return [...this.batchRoles.entries()]
      .filter(([, role]) => roleHasBatchPermission(role, permission))
      .map(([batchId]) => batchId)
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
  // Instructor/TA exam authorization (DD-003/DD-005/DD-006, approved 2026-08-28) is scoped
  // per-batch via `hasBatchPermission`, matching the enrollment role the actor actually holds in
  // the exam's batch — not "school admin or nothing." An exam's `batchId` is resolved once, at
  // creation, by `enrollment/service.ts::resolveQualifyingBatch` (DD-012); every check below
  // reuses that stored value rather than re-resolving it.

  public requireCanReadExam(exam: Exam): void {
    if (
      this.isSchoolAdmin() ||
      exam.studentId === this.profileId ||
      (exam.batchId !== null && this.hasBatchPermission(exam.batchId, EXAM_READ_PERMISSION))
    ) {
      return
    }

    throw forbidden()
  }

  /**
   * Unlike the other exam checks, this one runs *before* the exam row (and thus its `batchId`)
   * exists — the caller (`exams/service.ts::createExam`) resolves the qualifying batch via
   * `resolveQualifyingBatch` first and passes it here, so authorization and the batch stored on
   * the new row are always the exact same resolution, never two independent ones.
   */
  public requireCanCreateExam(batchId: string): void {
    if (this.isSchoolAdmin() || this.hasBatchPermission(batchId, EXAM_CREATE_PERMISSION)) {
      return
    }

    throw forbidden()
  }

  public requireCanUpdateExam(exam: Exam): void {
    if (
      this.isSchoolAdmin() ||
      (exam.batchId !== null && this.hasBatchPermission(exam.batchId, EXAM_UPDATE_PERMISSION))
    ) {
      return
    }

    throw forbidden()
  }

  // Recording a result is a status-changing update to the exam (PARITY_PLAN.md §11.6), so it's
  // gated by the same exam:update permission as requireCanUpdateExam, not a separate action.
  public requireCanRecordEvaluation(exam: Exam): void {
    this.requireCanUpdateExam(exam)
  }

  public getExamVisibility(): ExamReadScope {
    if (this.isSchoolAdmin()) {
      return { kind: 'all' }
    }

    const profileId = this.requireProfileId()
    const batchIds = this.batchIdsWithPermission(EXAM_READ_PERMISSION)
    return batchIds.length > 0 ? { kind: 'manageable', profileId, batchIds } : { kind: 'own', profileId }
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
