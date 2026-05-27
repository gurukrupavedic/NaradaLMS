import { drizzle } from 'drizzle-orm/node-postgres'
import { LRUCache } from 'lru-cache'
import { Pool } from 'pg'

import { env } from '@narada/env'
import { quotePgIdentifier, schoolSchemaName } from './provision'
import * as schema from './schema'

type BaseDatabase = ReturnType<typeof drizzle<typeof schema>>
declare const publicDatabaseBrand: unique symbol
declare const schoolDatabaseBrand: unique symbol

export type PublicDatabase = BaseDatabase & { readonly [publicDatabaseBrand]: 'public' }
export type SchoolDatabase = BaseDatabase & { readonly [schoolDatabaseBrand]: 'school' }
export type Database = PublicDatabase | SchoolDatabase

type CachedDb = { db: SchoolDatabase; pool: Pool }

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

export const publicDb = drizzle(publicPool, { schema }) as PublicDatabase

async function closePool(pool: Pool): Promise<void> {
  if (closedPools.has(pool)) return
  closedPools.add(pool)
  await pool.end()
}

export function getScopedDatabase(organizationId: string) {
  const cached = dbCache.get(organizationId)
  if (cached) return cached.db

  const schemaName = schoolSchemaName(organizationId)
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    options: `-c search_path=${quotePgIdentifier(schemaName)},public`,
  })

  const db = drizzle(pool, { schema }) as SchoolDatabase
  dbCache.set(organizationId, { db, pool })
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

export * from './schema'
export * from './provision'
