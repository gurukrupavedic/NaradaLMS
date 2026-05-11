import { db } from "../../server/db";
import {
  auditLogs,
  batches,
  chapters,
  enrollments,
  organizations,
  studentProgress,
  users,
} from "../../packages/types/src/schema";
import { batchService } from "../../server/modules/batch-cohort/service";
import { learningStorage } from "../../server/modules/learning-delivery/storage";
import { initAdminService } from "../../server/modules/system-admin/service";
import { AdminStorage } from "../../server/modules/system-admin/storage";
import { initializeEventHandlers } from "../../server/modules/system-admin/events";
import { eventBus } from "../../server/shared/events/event-bus";
import { and, desc, eq, sql } from "drizzle-orm";

const passed: string[] = [];
const failed: { name: string; error: string }[] = [];

function assert(condition: boolean, name: string, message?: string) {
  if (condition) {
    passed.push(name);
  } else {
    failed.push({ name, error: message ?? "Assertion failed" });
  }
}

async function getFixture() {
  const [slmtsOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, "slmts"))
    .limit(1);
  const [rrOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, "rr"))
    .limit(1);
  const [adminUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "admin@example.com"))
    .limit(1);
  const [studentUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.status, "active"),
        sql`'student' = ANY(${users.roles})`
      )
    )
    .limit(1);
  const [slmtsChapter] = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(eq(chapters.orgId, slmtsOrg!.id))
    .limit(1);

  if (!slmtsOrg || !rrOrg || !adminUser || !studentUser || !slmtsChapter) {
    throw new Error("Expected seeded slmts/rr orgs, admin user, student user, and a slmts chapter");
  }

  return {
    adminUserId: adminUser.id,
    rrOrgId: rrOrg.id,
    slmtsOrgId: slmtsOrg.id,
    slmtsChapterId: slmtsChapter.id,
    studentUserId: studentUser.id,
  };
}

async function createBatch(orgId: string, createdBy: string, prefix: string) {
  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const [created] = await db
    .insert(batches)
    .values({
      orgId,
      batchCode: `${prefix}-${uniqueSuffix}`,
      batchName: `${prefix} ${uniqueSuffix}`,
      createdBy,
    })
    .returning({ id: batches.id });

  return created.id;
}

async function testProgressAndAuditIsolation() {
  const fixture = await getFixture();
  const adminStorage = new AdminStorage();
  const auditAction = `L3B_AUDIT_${Date.now()}`;

  let rogueProgressId: number | null = null;
  let insertedAuditIds: number[] = [];

  try {
    await db
      .delete(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, fixture.adminUserId),
          eq(studentProgress.chapterId, fixture.slmtsChapterId)
        )
      );

    const [rogueProgress] = await db
      .insert(studentProgress)
      .values({
        orgId: fixture.rrOrgId,
        studentId: fixture.adminUserId,
        chapterId: fixture.slmtsChapterId,
        batchId: null,
        proficiencyLevel: 1,
        lastAccessed: new Date(),
      })
      .returning({ id: studentProgress.id });
    rogueProgressId = rogueProgress.id;

    const slmtsProgress = await learningStorage.getStudentProgress({
      studentId: fixture.adminUserId,
      orgId: fixture.slmtsOrgId,
      chapterId: fixture.slmtsChapterId,
    });
    assert(
      slmtsProgress.length === 0,
      "progress reads exclude rows whose physical org_id mismatches the request org",
      `Expected no progress rows for mismatched org_id, got ${slmtsProgress.length}`
    );

    await learningStorage.trackChapterAccess(
      fixture.adminUserId,
      fixture.slmtsChapterId,
      fixture.slmtsOrgId
    );

    const slmtsRows = await db
      .select({ id: studentProgress.id })
      .from(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, fixture.adminUserId),
          eq(studentProgress.chapterId, fixture.slmtsChapterId),
          eq(studentProgress.orgId, fixture.slmtsOrgId)
        )
      );
    assert(
      slmtsRows.length === 1,
      "trackChapterAccess creates or updates a row in the requested org scope",
      `Expected one slmts-scoped progress row, got ${slmtsRows.length}`
    );

    await (adminStorage as any).insertAuditLog(
      fixture.adminUserId,
      auditAction,
      "chapter",
      "chapter-1",
      { orgId: fixture.rrOrgId, scope: "org" },
      fixture.rrOrgId
    );

    const [storedAudit] = await db
      .select({ id: auditLogs.id, orgId: auditLogs.orgId })
      .from(auditLogs)
      .where(eq(auditLogs.action, auditAction))
      .orderBy(desc(auditLogs.id))
      .limit(1);

    if (storedAudit) {
      insertedAuditIds.push(storedAudit.id);
    }

    assert(
      storedAudit?.orgId === fixture.rrOrgId,
      "insertAuditLog persists audit_logs.org_id for org-scoped rows",
      `Expected stored audit org_id=${fixture.rrOrgId}, got ${String(storedAudit?.orgId)}`
    );

    const [mismatchedAudit] = await db
      .insert(auditLogs)
      .values({
        orgId: fixture.rrOrgId,
        userId: fixture.adminUserId,
        action: `${auditAction}_MISMATCH`,
        resourceType: "chapter",
        resourceId: "chapter-2",
        changes: {
          orgId: fixture.slmtsOrgId,
          scope: "org",
        },
        timestamp: new Date(),
      })
      .returning({ id: auditLogs.id });
    insertedAuditIds.push(mismatchedAudit.id);

    const scopedAudit = await adminStorage.getAuditLogs({
      scope: "org",
      orgId: fixture.slmtsOrgId,
      limit: 100,
      offset: 0,
    });
    const leakedAudit = scopedAudit.rows.find((row) => row.action === `${auditAction}_MISMATCH`);
    assert(
      !leakedAudit,
      "audit visibility uses audit_logs.org_id instead of changes.orgId",
      "Expected mismatched audit row to stay hidden from slmts-scoped audit queries"
    );

  } finally {
    if (insertedAuditIds.length > 0) {
      await db.delete(auditLogs).where(eq(auditLogs.action, auditAction));
      await db.delete(auditLogs).where(eq(auditLogs.action, `${auditAction}_MISMATCH`));
    }

    if (rogueProgressId) {
      await db.delete(studentProgress).where(eq(studentProgress.id, rogueProgressId));
    }

    await db
      .delete(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, fixture.adminUserId),
          eq(studentProgress.chapterId, fixture.slmtsChapterId),
          eq(studentProgress.orgId, fixture.slmtsOrgId)
        )
      );
  }
}

async function testEnrollmentIsolationAndAuditHandlers() {
  const fixture = await getFixture();
  const createdBatchIds: number[] = [];
  const createdEnrollmentIds: number[] = [];
  const createdAuditIds: number[] = [];
  const uniqueAudioId = Number(`${Date.now()}`.slice(-9));

  try {
    const rrBatchId = await createBatch(fixture.rrOrgId, fixture.adminUserId, "RRL3B");
    const slmtsBatchId = await createBatch(fixture.slmtsOrgId, fixture.adminUserId, "SL3B");
    createdBatchIds.push(rrBatchId, slmtsBatchId);

    const [rrEnrollment] = await db
      .insert(enrollments)
      .values({
        orgId: fixture.rrOrgId,
        batchId: rrBatchId,
        studentId: fixture.studentUserId,
        status: "active",
        enrolledBy: fixture.adminUserId,
      })
      .returning({ id: enrollments.id });
    createdEnrollmentIds.push(rrEnrollment.id);

    const eligibleStudents = await batchService.listEligibleStudents(
      slmtsBatchId,
      fixture.slmtsOrgId
    );
    assert(
      eligibleStudents.some((student) => student.id === fixture.studentUserId),
      "eligible students stay scoped to active enrollments in the current org",
      "Expected a student with only an rr enrollment to remain eligible in slmts"
    );

    let slmtsEnrollmentError: unknown = null;
    let slmtsEnrollmentId: number | null = null;
    try {
      const enrollment = await batchService.addEnrollment({
        orgId: fixture.slmtsOrgId,
        batchId: slmtsBatchId,
        studentId: fixture.studentUserId,
        enrolledBy: fixture.adminUserId,
      });
      slmtsEnrollmentId = enrollment.id;
      createdEnrollmentIds.push(enrollment.id);
    } catch (error) {
      slmtsEnrollmentError = error;
    }

    assert(
      !slmtsEnrollmentError && slmtsEnrollmentId !== null,
      "addEnrollment allows one active enrollment per org",
      slmtsEnrollmentError instanceof Error
        ? slmtsEnrollmentError.message
        : "Expected addEnrollment to accept a second active enrollment in another org"
    );

    const foreignDropResult = await (batchService as any).dropEnrollment({
      orgId: fixture.slmtsOrgId,
      enrollmentId: rrEnrollment.id,
      droppedBy: fixture.adminUserId,
      droppedReason: "cross-org attempt",
    });
    assert(
      !foreignDropResult,
      "dropEnrollment rejects foreign-org enrollment ids",
      "Expected dropping an rr enrollment from slmts context to return no updated row"
    );

    const [rrEnrollmentAfterDrop] = await db
      .select({ status: enrollments.status })
      .from(enrollments)
      .where(eq(enrollments.id, rrEnrollment.id))
      .limit(1);
    assert(
      rrEnrollmentAfterDrop?.status === "active",
      "foreign-org drop attempts leave the target enrollment unchanged",
      `Expected rr enrollment to stay active, got ${String(rrEnrollmentAfterDrop?.status)}`
    );

    eventBus.clear();
    initAdminService(new AdminStorage());
    initializeEventHandlers();

    await eventBus.publish("ChapterPublished", {
      orgId: fixture.slmtsOrgId,
      chapterId: fixture.slmtsChapterId,
      publishedBy: fixture.adminUserId,
      timestamp: new Date(),
    });
    await eventBus.publish("AudioUploaded", {
      orgId: fixture.slmtsOrgId,
      audioFileId: uniqueAudioId,
      chapterId: fixture.slmtsChapterId,
      uploadedBy: fixture.adminUserId,
      timestamp: new Date().toISOString(),
    });
    await eventBus.publish("StudentDropped", {
      orgId: fixture.slmtsOrgId,
      batchId: slmtsBatchId,
      studentId: fixture.studentUserId,
      droppedBy: fixture.adminUserId,
      timestamp: new Date().toISOString(),
    });
    await eventBus.publish("ProgressUpdated", {
      orgId: fixture.slmtsOrgId,
      studentId: fixture.studentUserId,
      chapterId: fixture.slmtsChapterId,
      proficiencyLevel: 2,
      evaluatedBy: fixture.adminUserId,
      timestamp: new Date().toISOString(),
    });

    const [chapterAudit] = await db
      .select({
        id: auditLogs.id,
        orgId: auditLogs.orgId,
        userId: auditLogs.userId,
      })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, "CHAPTER_PUBLISHED"),
          eq(auditLogs.resourceId, fixture.slmtsChapterId.toString())
        )
      )
      .orderBy(desc(auditLogs.id))
      .limit(1);
    if (chapterAudit) {
      createdAuditIds.push(chapterAudit.id);
    }
    assert(
      chapterAudit?.orgId === fixture.slmtsOrgId &&
        chapterAudit?.userId === fixture.adminUserId,
      "chapter publish audit rows persist org_id and actor via event handlers",
      "Expected ChapterPublished handler to write the active org_id and publisher"
    );

    const [audioAudit] = await db
      .select({
        id: auditLogs.id,
        orgId: auditLogs.orgId,
        userId: auditLogs.userId,
      })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, "AUDIO_UPLOADED"),
          eq(auditLogs.resourceId, uniqueAudioId.toString())
        )
      )
      .orderBy(desc(auditLogs.id))
      .limit(1);
    if (audioAudit) {
      createdAuditIds.push(audioAudit.id);
    }
    assert(
      audioAudit?.orgId === fixture.slmtsOrgId &&
        audioAudit?.userId === fixture.adminUserId,
      "audio upload audit rows persist org_id and actor via event handlers",
      "Expected AudioUploaded handler to write the active org_id and uploader"
    );

    const [studentDroppedAudit] = await db
      .select({
        id: auditLogs.id,
        orgId: auditLogs.orgId,
        userId: auditLogs.userId,
      })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, "STUDENT_DROPPED"),
          eq(auditLogs.resourceId, `${slmtsBatchId}-${fixture.studentUserId}`)
        )
      )
      .orderBy(desc(auditLogs.id))
      .limit(1);
    if (studentDroppedAudit) {
      createdAuditIds.push(studentDroppedAudit.id);
    }
    assert(
      studentDroppedAudit?.orgId === fixture.slmtsOrgId &&
        studentDroppedAudit?.userId === fixture.adminUserId,
      "student drop audit rows persist org_id and droppedBy via event handlers",
      "Expected StudentDropped handler to write the active org_id and dropping actor"
    );

    const [progressAudit] = await db
      .select({
        id: auditLogs.id,
        orgId: auditLogs.orgId,
        userId: auditLogs.userId,
      })
      .from(auditLogs)
      .where(eq(auditLogs.action, "PROGRESS_UPDATED"))
      .orderBy(desc(auditLogs.id))
      .limit(1);
    if (progressAudit) {
      createdAuditIds.push(progressAudit.id);
    }
    assert(
      progressAudit?.orgId === fixture.slmtsOrgId &&
        progressAudit?.userId === fixture.adminUserId,
      "progress update audit rows persist org_id and evaluator via event handlers",
      "Expected ProgressUpdated handler to write the active org_id and evaluator"
    );
  } finally {
    eventBus.clear();

    if (createdAuditIds.length > 0) {
      for (const id of createdAuditIds) {
        await db.delete(auditLogs).where(eq(auditLogs.id, id));
      }
    }

    for (const id of createdEnrollmentIds) {
      await db.delete(enrollments).where(eq(enrollments.id, id));
    }

    for (const id of createdBatchIds) {
      await db.delete(batches).where(eq(batches.id, id));
    }
  }
}

await testProgressAndAuditIsolation();
await testEnrollmentIsolationAndAuditHandlers();

if (failed.length > 0) {
  console.error("Failed:", failed);
  process.exit(1);
}

console.log(`layer3-pass-b-progress-audit-isolation: ${passed.length} assertions passed.`);
