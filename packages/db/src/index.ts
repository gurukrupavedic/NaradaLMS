import { drizzle } from 'drizzle-orm/node-postgres'
import { LRUCache } from 'lru-cache'
import { Pool } from 'pg'

import { env } from '@narada/env'
import * as schema from './schema'

type CachedDb = { db: ReturnType<typeof drizzle<typeof schema>>; pool: Pool }

const MAX_DB_CACHE_SIZE = 100
const closedPools = new WeakSet<Pool>()
const dbCache = new LRUCache<string, CachedDb>({
  max: MAX_DB_CACHE_SIZE,
  dispose: entry => {
    closePool(entry.pool).catch(() => {})
  },
})

const publicPool = new Pool({
  connectionString: env.DATABASE_URL,
  options: '-c search_path=public',
})

export const publicDb = drizzle(publicPool, { schema })

async function closePool(pool: Pool): Promise<void> {
  if (closedPools.has(pool)) return
  closedPools.add(pool)
  await pool.end()
}

export function clearSchoolDbCache(schoolSlug: string) {
  // Renames are rare; in-flight requests holding the old scoped DB may fail and retry.
  dbCache.delete(schoolSlug)
}

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

export async function shutdownPools(): Promise<void> {
  const pools = [...dbCache.values()].map(entry => entry.pool)
  const results = await Promise.allSettled([closePool(publicPool), ...pools.map(closePool)])
  dbCache.clear()

  const failures = results.filter(result => result.status === 'rejected')
  if (failures.length > 0) {
    throw new AggregateError(
      failures.map(result => result.reason),
      'failed to close one or more database pools',
    )
  }
}

export type Database = ReturnType<typeof getScopedDatabase>
export * from './schema'
export * from './provision'
