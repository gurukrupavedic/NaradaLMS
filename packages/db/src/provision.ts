import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { fileURLToPath } from 'url'
import path from 'path'

import { env } from '@narada/env'
import { sql } from 'drizzle-orm'

const schoolMigrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../drizzle/school',
)

const publicMigrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../drizzle/public',
)

export function schoolSchemaName(organizationId: string) {
  return `school-${organizationId}`
}

export function organizationIdFromSchoolSchema(schemaName: string) {
  return schemaName.startsWith('school-') ? schemaName.slice('school-'.length) : null
}

export function quotePgIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`
}

export async function listSchoolSchemaOrganizationIds(): Promise<string[]> {
  const adminPool = new Pool({ connectionString: env.DATABASE_URL })
  try {
    const result = await adminPool.query<{ schema_name: string }>(
      `
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'school-%'
        ORDER BY schema_name
      `,
    )

    return result.rows.flatMap(row => {
      const organizationId = organizationIdFromSchoolSchema(row.schema_name)
      return organizationId ? [organizationId] : []
    })
  } finally {
    await adminPool.end()
  }
}

export async function dropSchoolSchema(organizationId: string) {
  const adminPool = new Pool({ connectionString: env.DATABASE_URL })
  try {
    await drizzle(adminPool).execute(
      sql`DROP SCHEMA IF EXISTS ${sql.identifier(schoolSchemaName(organizationId))} CASCADE`,
    )
  } finally {
    await adminPool.end()
  }
}

export async function provisionSchool(organizationId: string) {
  const schemaName = schoolSchemaName(organizationId)
  const adminPool = new Pool({ connectionString: env.DATABASE_URL })
  try {
    await drizzle(adminPool).execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(schemaName)}`)
  } finally {
    await adminPool.end()
  }

  const schoolPool = new Pool({
    connectionString: env.DATABASE_URL,
    options: `-c search_path=${quotePgIdentifier(schemaName)},public`,
  })

  try {
    // Schema-scoped migration tracking: drizzle-orm's migrator defaults to a single
    // database-wide `drizzle.__drizzle_migrations` table, and decides what to apply by comparing
    // each migration file's folder timestamp against only the MOST RECENT row in that table
    // (`created_at desc limit 1`) — not a per-migration record. Every tenant is migrated from the
    // exact same files (identical timestamps), so without scoping this per schema, the *first*
    // school ever provisioned against a database applies and records the migrations correctly,
    // and every subsequent school's migration compares its files' timestamps against that same
    // already-newer row and silently no-ops — leaving that school's schema with zero tables.
    // Tracking each school's applied migrations inside its own schema makes every provisioning
    // call independent of every other school's history.
    await migrate(drizzle(schoolPool), {
      migrationsFolder: schoolMigrationsFolder,
      migrationsSchema: schemaName,
      migrationsTable: '__drizzle_migrations',
    })
  } finally {
    await schoolPool.end()
  }
}

// The public schema has no per-request provisioning step (there's only ever one), so nothing
// currently calls drizzle's migrate() for it — deploys ship new code that expects new public
// columns to exist with no automated step that actually adds them. This is that step: safe to
// call repeatedly, applies only whatever's pending since the last recorded migration. Not
// multi-tenant, so (unlike provisionSchool) no migrationsSchema override is needed — the default
// tracking table is fine here.
export async function migratePublicSchema() {
  const pool = new Pool({ connectionString: env.DATABASE_URL })
  try {
    await migrate(drizzle(pool), { migrationsFolder: publicMigrationsFolder })
  } finally {
    await pool.end()
  }
}

/**
 * `migratePublicSchema()`'s counterpart for every existing school: re-runs `provisionSchool` (whose
 * `migrate()` applies only what's newer than the schema's last-recorded migration, and no-ops once
 * everything is applied). Meant to run at API boot (`apps/api/src/index.ts`), not from CI: a
 * Railway deploy has no network path from outside Railway's project to a service's own Postgres
 * (its `DATABASE_URL` resolves a private `*.railway.internal` hostname), so the migration has to
 * run from inside the container that's actually starting, before it opens its HTTP port. Safe on
 * every boot, including a normal restart with nothing pending. A genuine same-instant race on the
 * exact same schema is still possible in principle (drizzle's migrator takes no advisory lock),
 * but isn't a concern for this app's single-instance deployment today.
 *
 * Returns the organization ids it migrated.
 */
export async function migrateAllSchoolSchemas(): Promise<string[]> {
  const pool = new Pool({ connectionString: env.DATABASE_URL })
  let organizationIds: string[]
  try {
    const result = await pool.query<{ id: string }>('SELECT id FROM organization')
    organizationIds = result.rows.map(row => row.id)
  } finally {
    await pool.end()
  }

  for (const organizationId of organizationIds) {
    await provisionSchool(organizationId)
  }
  return organizationIds
}
