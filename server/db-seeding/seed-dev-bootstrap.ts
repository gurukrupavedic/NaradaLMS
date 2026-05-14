import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { organizations, userOrganizations, users } from "@narada/types";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) {
    throw new Error(`${name} must be set in the environment`);
  }
  return v.trim();
}

function parseBool(v: string | undefined): boolean {
  return v === "1" || /^true$/i.test(v ?? "");
}

const DEFAULT_FIRST = "Dev";
const DEFAULT_LAST = "SuperAdmin";

/**
 * Idempotent dev seed: super-admin for `ADMIN_EMAIL` plus minimal
 * `user_organizations` rows (SLMTS active, RR pending).
 * Run after `npm run db:seed-orgs`.
 */
export async function seedDevBootstrap(): Promise<void> {
  console.log("Dev bootstrap seed (super-admin + memberships)...");
  const adminEmail = requireEnv("ADMIN_EMAIL");
  const resetPassword = parseBool(process.env.DEV_SUPERADMIN_RESET_PASSWORD);
  const now = new Date();

  const [slmtsRows, rrRows] = await Promise.all([
    db.select().from(organizations).where(eq(organizations.slug, "slmts")).limit(1),
    db.select().from(organizations).where(eq(organizations.slug, "rr")).limit(1),
  ]);

  if (!slmtsRows[0]) {
    throw new Error(
      'No organization with slug "slmts". Run `npm run db:seed-orgs` after migrations, then retry.'
    );
  }
  if (!rrRows[0]) {
    throw new Error(
      'No organization with slug "rr". Run `npm run db:seed-orgs` after migrations, then retry.'
    );
  }

  const slmtsOrg = slmtsRows[0];
  const rrOrg = rrRows[0];

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  const firstName =
    process.env.DEV_SUPERADMIN_FIRST_NAME?.trim() || DEFAULT_FIRST;
  const lastName =
    process.env.DEV_SUPERADMIN_LAST_NAME?.trim() || DEFAULT_LAST;

  let userId: string;

  if (!existing) {
    const password = process.env.DEV_SUPERADMIN_PASSWORD?.trim();
    if (!password) {
      throw new Error(
        "DEV_SUPERADMIN_PASSWORD is required when creating a new dev super-admin (no user row for ADMIN_EMAIL yet)."
      );
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [inserted] = await db
      .insert(users)
      .values({
        email: adminEmail,
        firstName,
        lastName,
        passwordHash,
        provider: "local",
        isSuperAdmin: true,
        approvedAt: now,
        approvedBy: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: users.id });

    if (!inserted) {
      throw new Error("Failed to insert dev super-admin user");
    }
    userId = inserted.id;
    console.log(`  created user for ${adminEmail}`);
  } else {
    userId = existing.id;
    const updates: {
      isSuperAdmin: boolean;
      updatedAt: Date;
      passwordHash?: string;
    } = {
      isSuperAdmin: true,
      updatedAt: now,
    };

    if (resetPassword) {
      const password = process.env.DEV_SUPERADMIN_PASSWORD?.trim();
      if (!password) {
        throw new Error(
          "DEV_SUPERADMIN_RESET_PASSWORD=1 requires DEV_SUPERADMIN_PASSWORD to set a new password hash."
        );
      }
      updates.passwordHash = await bcrypt.hash(password, 10);
      console.log(
        "  password hash reset (DEV_SUPERADMIN_RESET_PASSWORD=1)"
      );
    }

    await db.update(users).set(updates).where(eq(users.id, userId));
    console.log(`  updated existing user ${adminEmail}`);
  }

  await db
    .insert(userOrganizations)
    .values({
      userId,
      orgId: slmtsOrg.id,
      roles: ["student", "admin"],
      status: "active",
      requestedAt: now,
      approvedAt: now,
      approvedBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [userOrganizations.userId, userOrganizations.orgId],
      set: {
        roles: ["student", "admin"],
        status: "active",
        approvedAt: now,
        approvedBy: userId,
        updatedAt: now,
      },
    });
  console.log("  SLMTS membership: active (student + admin)");

  await db
    .insert(userOrganizations)
    .values({
      userId,
      orgId: rrOrg.id,
      roles: ["student"],
      status: "pending",
      requestedAt: now,
      approvedAt: null,
      approvedBy: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [userOrganizations.userId, userOrganizations.orgId],
      set: {
        roles: ["student"],
        status: "pending",
        approvedAt: null,
        approvedBy: null,
        updatedAt: now,
      },
    });
  console.log("  RR membership: pending (student)");

  console.log("Dev bootstrap seed complete.");
}

const isMainModule =
  process.argv[1] &&
  path.normalize(process.argv[1]) ===
    path.normalize(fileURLToPath(import.meta.url));

if (isMainModule) {
  seedDevBootstrap()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
