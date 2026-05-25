import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { fileURLToPath } from 'url'
import path from 'path'

import { env } from '@narada/env'

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../drizzle/school',
)

export async function renameSchool(oldSlug: string, newSlug: string) {
  const pool = new Pool({ connectionString: env.DATABASE_URL })
  try {
    await pool.query(`ALTER SCHEMA "school_${oldSlug}" RENAME TO "school_${newSlug}"`)
  } finally {
    await pool.end()
  }
}

export async function provisionSchool(schoolSlug: string) {
  const adminPool = new Pool({ connectionString: env.DATABASE_URL })
  await adminPool.query(`CREATE SCHEMA IF NOT EXISTS "school_${schoolSlug}"`)
  await adminPool.end()

  const schoolPool = new Pool({
    connectionString: env.DATABASE_URL,
    options: `-c search_path=school_${schoolSlug}`,
  })

  try {
    await migrate(drizzle(schoolPool), { migrationsFolder })
  } finally {
    await schoolPool.end()
  }
}
