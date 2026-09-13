import crypto from 'crypto'
import fs from 'fs'
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

async function pgTableExists(pool: Pool, schemaName: string, tableName: string): Promise<boolean> {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2
     ) AS exists`,
    [schemaName, tableName],
  )
  return result.rows[0]?.exists ?? false
}

/**
 * Whether `organizationId`'s schema needs {@link backfillLegacyMigrationTracking} before it can
 * be safely re-migrated. `true` only for a school provisioned before H1 added per-schema
 * migration tracking: its schema already has real tables (from the old, shared
 * `drizzle.__drizzle_migrations`-tracked migration run) but no tracking table of its own. A
 * schema that already has its own tracking table (already on the new scheme, whether freshly
 * created or already backfilled once), or one with no tables at all yet (a genuinely brand-new,
 * about-to-be-provisioned schema), needs no backfill.
 */
export async function needsLegacyMigrationBackfill(organizationId: string): Promise<boolean> {
  const schemaName = schoolSchemaName(organizationId)
  const pool = new Pool({ connectionString: env.DATABASE_URL })
  try {
    const [hasTrackingTable, hasCoreTable] = await Promise.all([
      pgTableExists(pool, schemaName, '__drizzle_migrations'),
      pgTableExists(pool, schemaName, 'profile'),
    ])
    return !hasTrackingTable && hasCoreTable
  } finally {
    await pool.end()
  }
}

/**
 * One-time bootstrap for a school provisioned before H1 (see `provisionSchool`'s comment above):
 * such a schema has no `<schema>.__drizzle_migrations` table of its own, so calling `migrate()`
 * against it as-is would try to replay the very first migration's `CREATE TABLE` statements
 * against tables that already exist, and fail. This seeds a single tracking row recording that
 * first migration (`meta/_journal.json`'s first entry) as already applied, using the exact
 * hash/timestamp format drizzle-orm's own migrator writes (see `dialect.migrate` in
 * `drizzle-orm/pg-core/dialect.js`: `hash` is the sha256 of the raw migration file, `created_at`
 * is the journal entry's `when`), so a normal `migrate()` call afterwards correctly applies only
 * what's genuinely still pending. A no-op — returns `false` without writing anything — for a
 * schema that doesn't need it (see {@link needsLegacyMigrationBackfill}).
 */
export async function backfillLegacyMigrationTracking(organizationId: string): Promise<boolean> {
  if (!(await needsLegacyMigrationBackfill(organizationId))) {
    return false
  }

  const schemaName = schoolSchemaName(organizationId)
  const journal = JSON.parse(
    fs.readFileSync(path.join(schoolMigrationsFolder, 'meta/_journal.json'), 'utf8'),
  ) as { entries: { tag: string; when: number }[] }

  const firstMigration = journal.entries[0]
  if (!firstMigration) {
    throw new Error('school migrations folder has no journal entries to backfill from')
  }

  const migrationSql = fs.readFileSync(
    path.join(schoolMigrationsFolder, `${firstMigration.tag}.sql`),
    'utf8',
  )
  const hash = crypto.createHash('sha256').update(migrationSql).digest('hex')

  const quotedSchema = quotePgIdentifier(schemaName)
  const pool = new Pool({ connectionString: env.DATABASE_URL })
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS ${quotedSchema}.__drizzle_migrations (
         id SERIAL PRIMARY KEY,
         hash text NOT NULL,
         created_at bigint
       )`,
    )
    await pool.query(
      `INSERT INTO ${quotedSchema}.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
      [hash, firstMigration.when],
    )
    return true
  } finally {
    await pool.end()
  }
}

/**
 * Applies any pending school-schema migrations to an already-provisioned school — the
 * general-purpose counterpart to `provisionSchool` (which only ever runs once, at creation).
 * Safe to call repeatedly and on both legacy (pre-H1) and current schemas: it backfills legacy
 * migration tracking first if needed, then delegates to `provisionSchool`, whose own `migrate()`
 * call is already idempotent (it applies only migrations newer than the schema's last-recorded
 * one, and no-ops entirely once everything is applied).
 */
export async function migrateExistingSchool(
  organizationId: string,
): Promise<{ backfilledLegacyTracking: boolean }> {
  const backfilledLegacyTracking = await backfillLegacyMigrationTracking(organizationId)
  await provisionSchool(organizationId)
  return { backfilledLegacyTracking }
}
