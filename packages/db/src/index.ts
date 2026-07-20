import type { ExtractTablesWithRelations } from 'drizzle-orm/relations'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { NodePgTransaction } from 'drizzle-orm/node-postgres/session'
import { LRUCache } from 'lru-cache'
import { Pool } from 'pg'

import { env } from '@narada/env'
import { quotePgIdentifier, schoolSchemaName } from './provision'
import { publicSchema, schoolSchema } from './schema'

type PublicSchema = typeof publicSchema
type SchoolSchema = typeof schoolSchema
type SchoolSchemaRelations = ExtractTablesWithRelations<SchoolSchema>

type PublicBaseDatabase = NodePgDatabase<PublicSchema> & { $client: Pool }
type SchoolBaseDatabase = NodePgDatabase<SchoolSchema> & { $client: Pool }

// Concrete transaction type stays private to @narada/db; only SchoolTransaction is needed
// today (the deprecated SchoolDbExecutor alias for apps/api/src). Add PublicTransaction back
// only if a deprecated public-transaction-capable alias is ever needed.
type SchoolTransaction = NodePgTransaction<SchoolSchema, SchoolSchemaRelations>

/** Root public-schema Drizzle client. May open transactions; only services/application composition should receive it. */
export type PublicDbClient = PublicBaseDatabase
/** Root, tenant-scoped Drizzle client returned by {@link getSchoolDb}. May open transactions; only services/application composition should receive it. */
export type SchoolDbClient = SchoolBaseDatabase

/**
 * Narrow school-schema query/mutation capability for repository functions.
 * Deliberately omits `transaction` (only a service may open one) and `execute`
 * (add it only once a real repository needs raw SQL).
 */
export type SchoolDb = Pick<SchoolDbClient, 'query' | 'select' | 'insert' | 'update' | 'delete'>
/** Narrow public-schema query/mutation capability for repository functions. See {@link SchoolDb}. */
export type PublicDb = Pick<PublicDbClient, 'query' | 'select' | 'insert' | 'update' | 'delete'>

/** @deprecated use SchoolDbClient */
export type SchoolDatabase = SchoolDbClient
/** @deprecated use PublicDbClient */
export type PublicDatabase = PublicDbClient
/** @deprecated use SchoolDb (repositories) or SchoolDbClient (services) */
export type SchoolDbExecutor = SchoolDbClient | SchoolTransaction
/** @deprecated split in H8 */
export type Database = PublicDbClient | SchoolDbClient

type CachedDb = { db: SchoolDbClient; pool: Pool }

const MAX_DB_CACHE_SIZE = 100
// closePool is idempotent (see below), so both LRU eviction and shutdownPools
// can race to close the same pool without double-closing it.
const closedPools = new WeakSet<Pool>()
// Caches one connection pool per organization. Evicting the least-recently-used
// entry closes its pool via `dispose`, so the cache also bounds live connections.
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

export const publicDb = drizzle(publicPool, { schema: publicSchema }) as PublicDbClient

/** Idempotent: safe to call on a pool that's already closing/closed (e.g. by LRU eviction). */
async function closePool(pool: Pool): Promise<void> {
  if (closedPools.has(pool)) return
  closedPools.add(pool)
  await pool.end()
}

/**
 * Returns the tenant-scoped Drizzle client for an organization's school schema,
 * creating and caching its connection pool on first access. The pool's search
 * path is scoped to that school's schema, falling back to `public`.
 */
export function getSchoolDb(organizationId: string): SchoolDbClient {
  const cached = dbCache.get(organizationId)
  if (cached) return cached.db

  const schemaName = schoolSchemaName(organizationId)
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    options: `-c search_path=${quotePgIdentifier(schemaName)},public`,
  })

  const db = drizzle(pool, { schema: schoolSchema }) as SchoolDbClient
  dbCache.set(organizationId, { db, pool })
  return db
}

/** @deprecated use getSchoolDb */
export const getScopedDatabase = getSchoolDb

/** Closes the public pool and every cached school pool exactly once; aggregates any close failures. */
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
export * from './ids'
