import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { fileURLToPath } from 'url'
import path from 'path'

import { env } from '@narada/env'
import { sql } from 'drizzle-orm'

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../drizzle/school',
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
      migrationsFolder,
      migrationsSchema: schemaName,
      migrationsTable: '__drizzle_migrations',
    })
  } finally {
    await schoolPool.end()
  }
}
