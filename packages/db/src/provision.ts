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
    // drizzle's migrate() tracks applied migrations in a fixed "drizzle" schema by default,
    // regardless of search_path — shared across every tenant. Without migrationsSchema here, the
    // first school's migrations get recorded there, so every school after that skips migrating
    // (already-applied, as far as that shared tracking table is concerned) and ends up with an
    // empty schema. Scoping the tracking table to this tenant's own schema fixes that.
    await migrate(drizzle(schoolPool), { migrationsFolder: schoolMigrationsFolder, migrationsSchema: schemaName })
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
