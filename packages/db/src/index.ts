import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { env } from '@narada/env'
import * as schema from './schema'
import * as authSchema from './schema/auth'

const dbCache = new Map<string, ReturnType<typeof drizzle<typeof schema>>>()

export const publicDb = drizzle(
  new Pool({
    connectionString: env.DATABASE_URL,
    options: '-c search_path=public',
    max: 1,
  }),
  { schema: authSchema },
)

export function getScopedDatabase(schoolSlug: string) {
  let instance = dbCache.get(schoolSlug)
  if (!instance) {
    const pool = new Pool({
      connectionString: env.DATABASE_URL,
      options: `-c search_path=school_${schoolSlug},public`,
    })

    instance = drizzle(pool, { schema })
    dbCache.set(schoolSlug, instance)
  }

  return instance
}

export type Database = ReturnType<typeof getScopedDatabase>
export * from './schema'
export * from './provision'
