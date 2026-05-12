import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../../server/db";
import { batches, organizations, userOrganizations, users } from "../../packages/types/src/schema";
import { eq } from "drizzle-orm";
import { batchService } from "../../server/modules/batch-cohort/service";

async function main() {
  const email = `eligible-${Date.now()}@test.local`;
  const batchCode = `ELIGIBLE-${Date.now()}`;
  let userId: string | null = null;
  let batchId: number | null = null;

  try {
    const [slmtsOrg] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, "slmts"))
      .limit(1);

    const [adminUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "admin@example.com"))
      .limit(1);

    assert.ok(slmtsOrg, "expected seeded slmts organization");
    assert.ok(adminUser, "expected seeded admin@example.com user");

    const [createdUser] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        email,
        provider: "local",
        passwordHash: "not-used",
        firstName: "Eligible",
        lastName: "Student",
      })
      .returning({ id: users.id });

    userId = createdUser.id;

    await db.insert(userOrganizations).values({
      userId,
      orgId: slmtsOrg.id,
      roles: ["student"],
      status: "active",
    });

    const [createdBatch] = await db
      .insert(batches)
      .values({
        orgId: slmtsOrg.id,
        batchCode,
        batchName: `${batchCode} Batch`,
        createdBy: adminUser.id,
      })
      .returning({ id: batches.id });

    batchId = createdBatch.id;

    const eligibleStudents = await batchService.listEligibleStudents(batchId, slmtsOrg.id);

    assert.ok(
      eligibleStudents.some((student) => student.id === userId),
      "expected active org membership to drive eligible-student selection even without legacy roles/status"
    );

    console.log("batch-eligible-students-membership: 1 assertion passed.");
  } finally {
    if (batchId !== null) {
      await db.delete(batches).where(eq(batches.id, batchId));
    }

    if (userId) {
      await db.delete(userOrganizations).where(eq(userOrganizations.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    }
  }
}

void main().catch((error) => {
  console.error("batch-eligible-students-membership failed:", error);
  process.exit(1);
});
