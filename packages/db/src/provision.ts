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

export function quotePgIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`
}

export async function dropSchoolSchema(organizationId: string) {
  const adminPool = new Pool({ connectionString: env.DATABASE_URL })
  try {
    await drizzle(adminPool).execute(
      sql`DROP SCHEMA IF EXISTS ${sql.raw(quotePgIdentifier(schoolSchemaName(organizationId)))} CASCADE`,
    )
  } finally {
    await adminPool.end()
  }
}

export async function provisionSchool(organizationId: string) {
  const schemaName = schoolSchemaName(organizationId)
  const adminPool = new Pool({ connectionString: env.DATABASE_URL })
  try {
    await drizzle(adminPool).execute(
      sql`CREATE SCHEMA IF NOT EXISTS ${sql.raw(quotePgIdentifier(schemaName))}`,
    )
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
