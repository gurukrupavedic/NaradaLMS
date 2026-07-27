import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const createdPools: FakePool[] = []

class FakePool extends EventEmitter {
  public config: Record<string, unknown>
  public totalCount = 0
  public idleCount = 0
  public waitingCount = 0
  private endResolvers: Array<() => void> = []
  private endRejecters: Array<(reason?: unknown) => void> = []

  constructor(config: Record<string, unknown>) {
    super()
    this.config = config
    createdPools.push(this)
  }

  end(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.endResolvers.push(resolve)
      this.endRejecters.push(reject)
    })
  }

  resolveEnd(): void {
    this.endResolvers.forEach(r => r())
  }

  rejectEnd(reason: unknown): void {
    this.endRejecters.forEach(r => r(reason))
  }
}

vi.mock('pg', () => ({ Pool: FakePool }))
vi.mock('drizzle-orm/node-postgres', () => ({ drizzle: vi.fn(() => ({})) }))

let envOverrides: Record<string, unknown> = {}
vi.mock('@narada/env', () => ({
  get env() {
    return {
      DATABASE_URL: 'postgres://test/test',
      DB_PUBLIC_POOL_MAX: 5,
      DB_SCHOOL_POOL_MAX: 3,
      DB_SCHOOL_POOL_CACHE_MAX: 2,
      DB_ACQUIRE_TIMEOUT_MS: 5000,
      DB_IDLE_TIMEOUT_MS: 30000,
      DB_STATEMENT_TIMEOUT_MS: 30000,
      DB_MAX_LIFETIME_SECONDS: 0,
      ...envOverrides,
    }
  },
}))

/** Extracts the schema name a school pool's `-c search_path="school-<id>",public` option was built with. */
function schemaOf(pool: FakePool): string | undefined {
  const options = pool.config.options as string | undefined
  const match = options?.match(/search_path="([^"]+)",public/)
  return match?.[1]
}

async function loadDb() {
  vi.resetModules()
  createdPools.length = 0
  return import('./index')
}

describe('packages/db pool lifecycle', () => {
  beforeEach(() => {
    envOverrides = {}
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('attaches an error listener to a school pool that does not crash and logs safely', async () => {
    const { getSchoolDb } = await loadDb()
    getSchoolDb('school-1')
    const pool = createdPools[createdPools.length - 1]

    expect(() => pool.emit('error', new Error('idle client terminated'))).not.toThrow()

    expect(console.error).toHaveBeenCalledWith(
      'pg pool error',
      expect.objectContaining({ schoolId: 'school-1', message: 'idle client terminated' }),
    )
    const loggedArg = vi.mocked(console.error).mock.calls[0][1] as Record<string, unknown>
    expect(loggedArg).not.toHaveProperty('connectionString')
    expect(loggedArg.message).toBe('idle client terminated')
  })

  it('attaches an error listener to the public pool', async () => {
    await loadDb()
    const publicPool = createdPools[0]

    expect(() => publicPool.emit('error', new Error('connection reset'))).not.toThrow()
    expect(console.error).toHaveBeenCalledWith(
      'pg pool error',
      expect.objectContaining({ pool: 'public', message: 'connection reset' }),
    )
  })

  it('applies the configured pool options', async () => {
    const { getSchoolDb } = await loadDb()
    const publicPool = createdPools[0]
    expect(publicPool.config).toMatchObject({
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 30000,
      maxLifetimeSeconds: 0,
    })

    getSchoolDb('school-1')
    const schoolPool = createdPools[createdPools.length - 1]
    expect(schoolPool.config).toMatchObject({
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 30000,
      maxLifetimeSeconds: 0,
    })
  })

  it('getPoolStats reports real counts', async () => {
    const { getSchoolDb, getPoolStats } = await loadDb()
    getSchoolDb('school-1')
    getSchoolDb('school-2')
    createdPools.forEach((pool, i) => {
      pool.totalCount = i + 1
      pool.idleCount = i
      pool.waitingCount = 0
    })

    const stats = getPoolStats()
    expect(stats.cachedSchools).toBe(2)
    expect(stats.public.total).toBe(createdPools[0].totalCount)
  })

  it('shutdownPools awaits a pool evicted immediately before shutdown', async () => {
    const { getSchoolDb, shutdownPools } = await loadDb()
    getSchoolDb('a')
    getSchoolDb('b')
    getSchoolDb('c') // cache max is 2 -> evicts 'a'

    const evictedPool = createdPools.find(pool => schemaOf(pool) === 'school-a')
    expect(evictedPool).toBeDefined()

    let settled = false
    const shutdown = shutdownPools().then(() => {
      settled = true
    })

    await Promise.resolve()
    await Promise.resolve()
    expect(settled).toBe(false)

    createdPools.forEach(pool => pool.resolveEnd())
    await shutdown
    expect(settled).toBe(true)
  })

  it('an eviction whose pool.end() rejects does not crash the process (no unhandled rejection)', async () => {
    const { getSchoolDb, shutdownPools } = await loadDb()
    getSchoolDb('a')
    getSchoolDb('b')
    getSchoolDb('c') // evicts 'a'

    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)

    const evictedPool = createdPools.find(pool => schemaOf(pool) === 'school-a')
    expect(evictedPool).toBeDefined()
    evictedPool?.rejectEnd(new Error('close failed'))

    await new Promise(resolve => setImmediate(resolve))
    await new Promise(resolve => setImmediate(resolve))

    process.off('unhandledRejection', unhandled)
    expect(unhandled).not.toHaveBeenCalled()

    // clean up remaining open handles for this test: shutdownPools() calls pool.end() on every
    // still-open pool, so resolve those only after triggering shutdown (resolving beforehand
    // would be a no-op since end() hasn't been called on them yet).
    const cleanup = shutdownPools().catch(() => {})
    createdPools.forEach(pool => pool.resolveEnd())
    await cleanup
  })
})
