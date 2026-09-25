import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { LRUCache } from 'lru-cache'
import { Pool } from 'pg'

import { env } from '@narada/env'
import { quotePgIdentifier, schoolSchemaName } from './provision'
import { publicSchema, schoolSchema } from './schema'

type PublicSchema = typeof publicSchema
type SchoolSchema = typeof schoolSchema

type PublicBaseDatabase = NodePgDatabase<PublicSchema> & { $client: Pool }
type SchoolBaseDatabase = NodePgDatabase<SchoolSchema> & { $client: Pool }

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

type CachedDb = { db: SchoolDbClient; pool: Pool }

// closePool is idempotent (see below), so both LRU eviction and shutdownPools
// can race to close the same pool without double-closing it.
const closedPools = new WeakSet<Pool>()
// Pools evicted from the cache close asynchronously; shutdownPools must be able to await an
// eviction that started just before shutdown (DD-015 §3.3).
const closingPools = new Set<Promise<void>>()

// Caches one connection pool per organization. Evicting the least-recently-used
// entry closes its pool via `dispose`, so the cache also bounds live connections.
const dbCache = new LRUCache<string, CachedDb>({
  max: env.DB_SCHOOL_POOL_CACHE_MAX,
  dispose: (entry, key) => {
    console.warn('closing evicted school database pool', { schoolId: key })
    const closing = closePool(entry.pool)
    closingPools.add(closing)
    // The `.catch` must sit at the END of the chain, not on `closing` itself: `.finally()`
    // returns a NEW promise that re-rejects if `closing` rejects, and leaving THAT one
    // unhandled crashes the process on a failing pool.end(). `closing` itself stays
    // unswallowed so shutdownPools' allSettled below can still observe and aggregate a real
    // close failure.
    closing.finally(() => closingPools.delete(closing)).catch(() => {})
  },
})

const publicPool = new Pool({
  connectionString: env.DATABASE_URL,
  options: '-c search_path=public',
  max: env.DB_PUBLIC_POOL_MAX,
  idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: env.DB_ACQUIRE_TIMEOUT_MS,
  statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
  maxLifetimeSeconds: env.DB_MAX_LIFETIME_SECONDS,
})

// pg.Pool extends EventEmitter: an 'error' event with zero listeners throws and crashes the
// process. Idle-connection drops and network blips emit here routinely.
publicPool.on('error', error => {
  console.error('pg pool error', { pool: 'public', message: error.message })
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

  console.warn('creating school database pool', { schoolId: organizationId })

  const schemaName = schoolSchemaName(organizationId)
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    options: `-c search_path=${quotePgIdentifier(schemaName)},public`,
    max: env.DB_SCHOOL_POOL_MAX,
    idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: env.DB_ACQUIRE_TIMEOUT_MS,
    statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
    maxLifetimeSeconds: env.DB_MAX_LIFETIME_SECONDS,
  })

  pool.on('error', error => {
    console.error('pg pool error', { schoolId: organizationId, message: error.message })
  })

  const db = drizzle(pool, { schema: schoolSchema }) as SchoolDbClient
  dbCache.set(organizationId, { db, pool })
  return db
}

/** Closes the public pool and every cached school pool exactly once; aggregates any close failures. */
export async function shutdownPools(): Promise<void> {
  const cachedPools = [...dbCache.values()].map(entry => entry.pool)
  dbCache.clear() // stop new callers from getting a pool we're about to close
  const results = await Promise.allSettled([
    closePool(publicPool),
    ...cachedPools.map(pool => closePool(pool)),
    ...closingPools, // pools evicted and mid-close before shutdown began
  ])

  const failures = results.filter(result => result.status === 'rejected')
  if (failures.length > 0) {
    throw new AggregateError(
      failures.map(result => result.reason),
      'failed to close one or more database pools',
    )
  }
}

/** Point-in-time pool census for logging/diagnostics. Not wired to any endpoint or exporter. */
export function getPoolStats(): {
  public: { total: number; idle: number; waiting: number }
  cachedSchools: number
  schools: { total: number; idle: number; waiting: number }
} {
  const schoolPools = [...dbCache.values()].map(entry => entry.pool)
  return {
    public: {
      total: publicPool.totalCount,
      idle: publicPool.idleCount,
      waiting: publicPool.waitingCount,
    },
    cachedSchools: dbCache.size,
    schools: {
      total: schoolPools.reduce((sum, pool) => sum + pool.totalCount, 0),
      idle: schoolPools.reduce((sum, pool) => sum + pool.idleCount, 0),
      waiting: schoolPools.reduce((sum, pool) => sum + pool.waitingCount, 0),
    },
  }
}

export * from './schema'
export * from './provision'
export * from './courseSlug'
export * from './ids'
