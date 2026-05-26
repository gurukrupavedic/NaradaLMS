import { drizzle } from 'drizzle-orm/node-postgres'
import { LRUCache } from 'lru-cache'
import { Pool } from 'pg'

import { env } from '@narada/env'
import * as schema from './schema'

const MAX_DB_CACHE_SIZE = 100

type CachedDb = { db: ReturnType<typeof drizzle<typeof schema>>; pool: Pool }
const dbCache = new LRUCache<string, CachedDb>({
  max: MAX_DB_CACHE_SIZE,
  dispose: entry => {
    entry.pool.end().catch(() => {})
  },
})

export function clearSchoolDbCache(schoolSlug: string) {
  // Renames are rare; in-flight requests holding the old scoped DB may fail and retry.
  dbCache.delete(schoolSlug)
}

export const publicDb = drizzle(
  new Pool({
    connectionString: env.DATABASE_URL,
    options: '-c search_path=public',
  }),
  { schema },
)

export function getScopedDatabase(schoolSlug: string) {
  const cached = dbCache.get(schoolSlug)
  if (cached) return cached.db

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    options: `-c search_path=school_${schoolSlug},public`,
  })

  const db = drizzle(pool, { schema })
  dbCache.set(schoolSlug, { db, pool })
  return db
}

export type Database = ReturnType<typeof getScopedDatabase>
export * from './schema'
export * from './provision'
