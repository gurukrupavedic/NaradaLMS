import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../../../server/db";
import { organizations, userOrganizations, users } from "../../packages/types/src/schema";
import { eq } from "drizzle-orm";
import { AdminStorage } from "../../../server/modules/system-admin/storage";

async function createUserWithMembership(input: {
  email: string;
  orgId: string;
  membershipStatus: "pending" | "active";
}) {
  const [createdUser] = await db
    .insert(users)
    .values({
      id: randomUUID(),
      email: input.email,
      provider: "local",
      passwordHash: "not-used",
      firstName: input.membershipStatus === "active" ? "Active" : "Pending",
      lastName: "Membership",
    })
    .returning({ id: users.id });

  await db.insert(userOrganizations).values({
    userId: createdUser.id,
    orgId: input.orgId,
    roles: ["student"],
    status: input.membershipStatus,
  });

  return createdUser.id;
}

async function main() {
  const adminStorage = new AdminStorage();
  const activeEmail = `stats-active-${Date.now()}@test.local`;
  const pendingEmail = `stats-pending-${Date.now()}@test.local`;
  const createdUserIds: string[] = [];

  try {
    const [slmtsOrg] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, "slmts"))
      .limit(1);

    assert.ok(slmtsOrg, "expected seeded slmts organization");

    const before = await adminStorage.getAdminStats(1);

    createdUserIds.push(
      await createUserWithMembership({
        email: activeEmail,
        orgId: slmtsOrg.id,
        membershipStatus: "active",
      })
    );
    createdUserIds.push(
      await createUserWithMembership({
        email: pendingEmail,
        orgId: slmtsOrg.id,
        membershipStatus: "pending",
      })
    );

    const after = await adminStorage.getAdminStats(1);

    assert.equal(
      Number(after.totalUsers),
      Number(before.totalUsers) + 2,
      "expected totalUsers delta to include both users"
    );
    assert.equal(
      Number(after.activeUsers),
      Number(before.activeUsers) + 1,
      "expected activeUsers to count distinct users with active memberships"
    );
    assert.equal(
      Number(after.pendingApprovals),
      Number(before.pendingApprovals) + 1,
      "expected pendingApprovals to count pending memberships"
    );

    console.log("admin-stats-membership: 3 assertions passed.");
  } finally {
    for (const userId of createdUserIds) {
      await db.delete(userOrganizations).where(eq(userOrganizations.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    }
  }
}

void main().catch((error) => {
  console.error("admin-stats-membership failed:", error);
  process.exit(1);
});
