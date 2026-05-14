import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../db";
import { organizations } from "@narada/types";

const BASELINE_ORGS = [
  {
    name: "Sri Lalita Maha Tripura Sundari Pathasala",
    slug: "slmts",
    status: "active" as const,
  },
  {
    name: "Raja Rajeswari Pathasala",
    slug: "rr",
    status: "active" as const,
  },
];

/**
 * Idempotent seed: ensures canonical tenant org rows exist (`slmts`, `rr`).
 * Safe to run after `npm run db:reset` / `drizzle-kit migrate`.
 */
export async function seedOrganizations(): Promise<void> {
  console.log("Seeding baseline organizations (slmts, rr)...");
  const now = new Date();

  for (const row of BASELINE_ORGS) {
    const inserted = await db
      .insert(organizations)
      .values({
        name: row.name,
        slug: row.slug,
        status: row.status,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: organizations.slug })
      .returning({ id: organizations.id });

    if (inserted.length > 0) {
      console.log(`  inserted slug=${row.slug}`);
    } else {
      console.log(`  skipped (already exists) slug=${row.slug}`);
    }
  }

  console.log("Organization seed complete.");
}

const isMainModule =
  process.argv[1] &&
  path.normalize(process.argv[1]) ===
    path.normalize(fileURLToPath(import.meta.url));

if (isMainModule) {
  seedOrganizations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
