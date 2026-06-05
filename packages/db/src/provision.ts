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
    await migrate(drizzle(schoolPool), { migrationsFolder })
  } finally {
    await schoolPool.end()
  }
}
