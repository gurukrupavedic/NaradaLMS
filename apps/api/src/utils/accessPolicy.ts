import {
  enrollment,
  member,
  organization,
  publicDb,
  type SchoolDbClient,
  type SchoolProfile,
} from '@narada/db'
import {
  hasBatchPermission as roleHasBatchPermission,
  type BatchPermissions,
} from '@narada/auth/permissions'

import { isProfilePartOfCourse } from '../courses/repository'
import { forbidden } from '../error'
import { hasSharedInstructorEnrollment, isEnrolledInAnyBatch } from '../enrollment/service'
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
// exam:read (instructor/TA): studentId === profileId OR the student is enrolled in one of
// `batchIds` (the batches where the actor is instructor/TA). `batchIds`
// is always non-empty for 'manageable' — an empty-permission actor gets 'own' instead, so
// repository code never has to special-case an empty SQL IN-list.
export type ExamReadScope =
  | { kind: 'all' }
  | { kind: 'own'; profileId: string }
  | { kind: 'manageable'; profileId: string; batchIds: string[] }
// Simpler than `ExamReadScope`: an exam-slot request isn't attached to any batch at all, so there's
// no 'manageable' widening to account for — an admin sees every request, everyone else only theirs.
export type ExamSlotRequestReadScope = { kind: 'all' } | { kind: 'own'; profileId: string }
// Every school member can read published content; a caller who can also author it (content:update
// — owner/admin) additionally sees drafts. No profile involved — this is a school-membership
// question, not a per-batch one.
export type ContentReadView = { kind: 'authoring' } | { kind: 'learnerPreview' }
// Which courses a caller may pick from: a school admin sees every one, anyone else the ones their own
// profile is part of (see `courses/repository.ts::findForProfile`).
export type CourseReadScope = { kind: 'all' } | { kind: 'ofProfile'; profileId: string }
// `batchIds` is always non-empty for 'manageable' — see `getEnrollmentRequestVisibility`, which
// throws instead of returning an empty one (matching `ExamReadScope`'s own 'manageable' contract).
export type EnrollmentRequestReadScope = { kind: 'all' } | { kind: 'manageable'; batchIds: string[] }

type AccessPolicySource = {
  db: SchoolDbClient
  school: School
  user: User
  profile?: SchoolProfile
}

const ENROLLMENT_CREATE_PERMISSION: BatchPermissions = { enrollment: ['create'] }
const ENROLLMENT_REMOVE_PERMISSION: BatchPermissions = { enrollment: ['remove'] }
const EXAM_UPDATE_PERMISSION: BatchPermissions = { exam: ['update'] }
const EVALUATION_CREATE_PERMISSION: BatchPermissions = { evaluation: ['create'] }

/**
 * The single authorization vocabulary for domain services. Holds an
 * actor's resolved school role and, if a profile is active, their per-batch roles, so a service
 * asks a typed `require*`/`get*Visibility` question instead of re-deriving permissions itself.
 */
export class AccessPolicy {
  private constructor(
    private readonly db: SchoolDbClient,
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
      db,
      user.id,
      profile?.id ?? null,
      normalizeSchoolRole(membership?.role),
      new Map(batchRoleRows.map(row => [row.batchId, row.role])),
      user.isSuperAdmin,
    )
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

  public requireCanCreateBatch(): void {
    this.requireSchoolAdmin()
  }

  public requireCanUpdateBatch(): void {
    this.requireSchoolAdmin()
  }

  public getCourseVisibility(): CourseReadScope {
    if (this.isSchoolAdmin()) {
      return { kind: 'all' }
    }

    return { kind: 'ofProfile', profileId: this.requireProfileId() }
  }

  /**
   * The content gate: whether the actor may read a course's content (its tracks and chapters). A
   * school admin may read every course's; anyone else only the courses their own profile is part of
   * — the same rule as `getCourseVisibility`, so what the course dropdown offers is what the content
   * endpoints allow. A caller with no active profile is part of nothing.
   *
   * This is about *reading a course's content*. Batches, enrollments, exams and evaluations are
   * already limited by the caller's batch roles, and a batch belongs to exactly one course, so they
   * need no separate course check.
   */
  public async canReadCourseContent(courseId: string): Promise<boolean> {
    if (this.isSchoolAdmin()) {
      return true
    }

    if (!this.profileId) {
      return false
    }

    return isProfilePartOfCourse(this.db, this.profileId, courseId)
  }

  /** {@link canReadCourseContent} as a 403 — for a request that *names* a course (a list), where saying "not yours" discloses nothing. By-id reads 404 instead; see the tracks/chapters services. */
  public async requireCanReadCourseContent(courseId: string): Promise<void> {
    if (!(await this.canReadCourseContent(courseId))) {
      throw forbidden('you are not part of this course')
    }
  }

  /**
   * The read scope for "list `targetProfileId`'s batches": school-wide access grants 'all' only for a **self** lookup
   * (an admin looking at their own batches) — looking up someone else's batches is always scoped
   * to that person's own enrollments, never the whole school, whether the caller is a super
   * admin, owner, admin, or a shared instructor/TA. School-wide status there only grants
   * *permission* to skip the shared-instructor-enrollment check below, not license to ignore
   * which profile was actually asked for.
   */
  public async getProfileBatchListScope(targetProfileId: string): Promise<BatchReadScope> {
    if (targetProfileId === this.profileId) {
      return this.isSchoolAdmin()
        ? { kind: 'all' }
        : { kind: 'enrolled', profileId: targetProfileId }
    }

    if (this.isSchoolAdmin()) {
      return { kind: 'enrolled', profileId: targetProfileId }
    }

    if (
      this.profileId &&
      (await hasSharedInstructorEnrollment(this.db, this.profileId, targetProfileId))
    ) {
      return { kind: 'enrolled', profileId: targetProfileId }
    }

    throw forbidden()
  }

  // -- Content (tracks/chapters) -----------------------------------------------
  // Verified against packages/auth/src/permissions/school.ts: every role (member included) holds
  // content:read; only owner/admin additionally hold content:update. No profile is consulted —
  // this is a school-membership question, matching apps/api/src's authorizeContentReadView (which
  // checks `content:read` for the base requirement and `content:update` for the authoring
  // upgrade, not any per-batch role).
  public getContentReadView(): ContentReadView {
    return this.isSchoolAdmin() ? { kind: 'authoring' } : { kind: 'learnerPreview' }
  }

  // Writing content (scripts, segments, audio) is the same content:update permission
  // `getContentReadView` already checks to decide authoring vs learnerPreview — school-membership
  // only, no per-chapter or per-batch dimension.
  public requireCanUpdateContent(): void {
    this.requireSchoolAdmin()
  }

  // -- Enrollment (batch roster) ----------------------------------------------
  // Only instructor (not ta, not student) holds enrollment:create/remove at the batch level —
  // verified against packages/auth/src/permissions/batch.ts. School admin bypasses both
  // unconditionally, matching apps/api/src/routes/enrollment.ts's getBatchAccess calls, which
  // pass the same schoolPermission for both create and remove.

  public requireCanCreateEnrollment(batchId: string): void {
    if (this.isSchoolAdmin() || this.hasBatchPermission(batchId, ENROLLMENT_CREATE_PERMISSION)) {
      return
    }

    throw forbidden()
  }

  public requireCanRemoveEnrollment(batchId: string): void {
    if (this.isSchoolAdmin() || this.hasBatchPermission(batchId, ENROLLMENT_REMOVE_PERMISSION)) {
      return
    }

    throw forbidden()
  }

  /**
   * The list-visibility counterpart to `requireCanCreateEnrollment` (approving a request is
   * exactly creating an enrollment, so review actions already reuse that check once a request's
   * `batchId` is known) — a school admin sees every pending request, an instructor/TA sees only
   * the ones for batches where they hold `enrollment:create`, and anyone else (a plain student)
   * is rejected outright rather than getting an empty-but-technically-200 list.
   */
  public getEnrollmentRequestVisibility(): EnrollmentRequestReadScope {
    if (this.isSchoolAdmin()) {
      return { kind: 'all' }
    }

    const batchIds = this.batchIdsWithPermission(ENROLLMENT_CREATE_PERMISSION)
    if (batchIds.length === 0) {
      throw forbidden()
    }

    return { kind: 'manageable', batchIds }
  }

  // -- Exams ------------------------------------------------------------------
  // Instructor/TA exam authorization is scoped through the student: an instructor/TA with
  // `exam:update` in a batch may see and reschedule the sittings of any student enrolled in that
  // batch (past or present) — not "school admin or nothing." An exam carries no batch of its own;
  // see `teachesStudent`.
  //
  // Booking a sitting (requireCanCreateExam) is the one exception: it was originally a batch-role
  // check like the others, but exam bookings are now a school-admin (or super-admin) decision, so
  // it no longer touches batch roles at all — see its own doc comment.
  //
  // The "can see every exam in this batch" checks below deliberately test EXAM_UPDATE_PERMISSION,
  // not EXAM_READ_PERMISSION: the batch ACL grants `exam:read` to students too (so they can read
  // their OWN exam — already covered by the studentId check), but only instructor/ta hold
  // `exam:update`. Using `read` here would let a student see every other student's exam in a
  // batch they merely happen to also be enrolled in.

  /** Whether the actor holds `exam:update` (instructor/TA) in a batch `studentId` is enrolled in. */
  private async teachesStudent(studentId: string): Promise<boolean> {
    return isEnrolledInAnyBatch(this.db, studentId, this.batchIdsWithPermission(EXAM_UPDATE_PERMISSION))
  }

  /**
   * Booking a sitting is a school-admin (or super-admin) decision, not a batch role — revises the
   * exam-booking feature's prior "instructor/TA with exam:create in the qualifying batch" rule.
   * `exam:create` no longer exists as a batch permission at all (packages/auth/src/permissions/
   * batch.ts), so this doesn't need the exam's batchId the way requireCanUpdateExam still does; it
   * runs first in `exams/service.ts::createExam`, before the qualifying batch is even resolved.
   * Matches `requireCanRecordEvaluation`'s shape for the same reason: booking and grading a
   * certification sitting are both school-level decisions, unlike rescheduling one.
   */
  public requireCanCreateExam(): void {
    this.requireSchoolAdmin()
  }

  // No school-admin fallback: a plain owner/admin who isn't also enrolled as instructor/TA in a
  // batch the student is in cannot update it here — unlike requireCanCreateExam above,
  // rescheduling/cancelling stays a batch-role decision.
  public async requireCanUpdateExam(exam: Exam): Promise<void> {
    if (this.isSuperAdmin || (await this.teachesStudent(exam.studentId))) {
      return
    }

    throw forbidden()
  }

  // Deliberately narrower than requireCanUpdateExam (a batch instructor/TA can reschedule or
  // cancel their own exam, but not grade one) — recording a result is what grants `level4` (and
  // L1–L3 across the whole track), so it's gated on school-admin status alone, independent of any
  // batch role. See evaluations/schema.ts's teacherGradableLevelSchema for the other half of
  // that split.
  public requireCanRecordEvaluation(): void {
    this.requireSchoolAdmin()
  }

  // -- Exam slots ---------------------------------------------------------------
  // Opening a slot, approving a request, and rejecting one are all school-admin (or super-admin)
  // decisions — each goes through `requireCanCreateExam` above directly (examSlots/service.ts),
  // rather than a dedicated method here, since the question ("can this actor make an
  // exam-booking decision") is exactly the same one. Requesting a slot has no permission check at
  // all (any active profile may attempt it for themselves; the service's own L3-across-the-track
  // eligibility check is the real gate) — so the one method this section needs is who may *list*
  // requests, which (unlike a bare slot) carry a student.

  // "List every exam-slot request I can see". An admin sees every request school-wide; anyone else
  // only their own — never widened by a batch role, because (unlike `getExamVisibility`) there's no
  // batch dimension here to widen through.
  public getExamSlotRequestVisibility(): ExamSlotRequestReadScope {
    if (this.isSchoolAdmin()) {
      return { kind: 'all' }
    }

    return { kind: 'own', profileId: this.requireProfileId() }
  }

  /**
   * A super admin always sees every exam, profile or not. A school admin (owner/admin) sees
   * every exam ONLY when no profile is supplied — supplying one switches even an admin to scoped
   * (own + manageable) visibility. Verified directly against `apps/api/src/routes/exams.ts`:
   * `if (isSuperAdmin) all; else if (profile) scoped; else (school evaluation:read gate) all` —
   * profile presence, not admin status, decides scoped vs. all for everyone but a super admin.
   */
  public getExamVisibility(): ExamReadScope {
    if (this.isSuperAdmin) {
      return { kind: 'all' }
    }

    if (!this.profileId) {
      if (this.isSchoolAdmin()) {
        return { kind: 'all' }
      }

      throw forbidden()
    }

    const batchIds = this.batchIdsWithPermission(EXAM_UPDATE_PERMISSION)
    return batchIds.length > 0
      ? { kind: 'manageable', profileId: this.profileId, batchIds }
      : { kind: 'own', profileId: this.profileId }
  }

  /**
   * The read scope for "list *my own* sittings" (the student dashboard's "Sitting history") — a
   * *different* question from {@link getExamVisibility}'s "list exams I can see," which widens to
   * 'manageable' (own + every student's in a batch this profile teaches) for anyone holding
   * `exam:update` anywhere. That widening is correct for a grading queue, but a profile who is
   * *also* a TA/instructor elsewhere would otherwise see their students' sittings mixed into what
   * the UI presents as their own personal history. Mirrors `getProfileBatchListScope`'s own
   * reasoning for the same shape of bug on batches: a personal-record lookup stays scoped to the
   * caller's own profile regardless of what else they're permitted to manage.
   */
  public getOwnExamScope(): ExamReadScope {
    return { kind: 'own', profileId: this.requireProfileId() }
  }

  // -- Evaluations --------------------------------------------------------------
  // There's no general hasSchoolPermission() — but under the current school ACL
  // (packages/auth/src/permissions/school.ts), only owner/admin hold evaluation:read at all (member
  // gets none), which is exactly isSchoolAdmin(). If the school ACL ever grants `member`
  // evaluation:read, these checks need a real permission-statement call instead of this shortcut.

  public requireCanReadBatchEvaluations(batchId: string): void {
    if (this.isSchoolAdmin() || this.hasBatchPermission(batchId, EVALUATION_CREATE_PERMISSION)) {
      return
    }

    throw forbidden()
  }

  // A school admin/owner can grade any batch's roster, not just one they're personally enrolled
  // in as instructor/TA — matching the read-side check above (requireCanReadBatchEvaluations
  // carries the same isSchoolAdmin() fallback). This is a deliberate product decision: admins need
  // to be able to correct or record a grade even for a batch they don't personally teach.
  public requireCanCreateEvaluation(batchId: string): void {
    if (
      this.isSuperAdmin ||
      this.isSchoolAdmin() ||
      this.hasBatchPermission(batchId, EVALUATION_CREATE_PERMISSION)
    ) {
      return
    }

    throw forbidden()
  }

  // -- Profiles ---------------------------------------------------------------

  // Gated on the same permission as creating an enrollment (school enrollment:create) — the only
  // reason to search across every profile in the school is the admin "enroll a student" flow.
  // Under the current school ACL (packages/auth/src/permissions/school.ts), only owner/admin hold
  // enrollment:create at all (member gets none), so this is exactly isSchoolAdmin() today — same
  // shortcut already used for requireCanReadBatchEvaluations; see its comment if the school ACL
  // ever changes.
  public requireCanSearchProfiles(): void {
    this.requireSchoolAdmin()
  }

  /**
   * The profile page's audience, exactly: the profile's own owner, a school admin, or a teacher
   * who shares a batch with this profile (instructor/ta in a batch this profile is also enrolled
   * in) — the same relationship `getProfileBatchListScope` above already checks for "can this
   * caller see that profile's batches," reused here for "can this caller see that profile at all."
   */
  public async requireCanViewProfile(targetProfileId: string): Promise<void> {
    if (targetProfileId === this.profileId || this.isSchoolAdmin()) {
      return
    }

    if (
      this.profileId &&
      (await hasSharedInstructorEnrollment(this.db, this.profileId, targetProfileId))
    ) {
      return
    }

    throw forbidden()
  }

  // -- Registrations ------------------------------------------------------------

  /** Reviewing a registration (list/read/approve/reject) is a school-admin action — a prospective
   * student's application is never visible to ordinary members. */
  public requireCanReviewRegistrations(): void {
    this.requireSchoolAdmin()
  }

  /** Owner/admin (or super admin) only — the check every admin-only `requireCan*` method below reduces to. */
  private requireSchoolAdmin(): void {
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

// A *missing* membership row is not this function's concern — it's
// already rejected in `load()` before this runs, except for a super admin, for whom the return
// value here is never actually consulted (isSchoolAdmin() short-circuits on
// isSuperAdmin first). A *present* role value outside owner/admin/member fails closed instead
// of being silently downgraded to `member` — the old backend already fails closed here
// structurally (BetterAuth's hasPermission has no matching statement for an unrecognized role),
// so this matches parity rather than deviating from it.
function normalizeSchoolRole(role: typeof member.$inferSelect.role | undefined): SchoolRole {
  if (role === undefined || role === 'owner' || role === 'admin' || role === 'member') {
    return role ?? 'member'
  }

  throw forbidden()
}
