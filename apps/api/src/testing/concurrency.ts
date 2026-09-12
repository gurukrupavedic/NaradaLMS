import { quotePgIdentifier } from '@narada/db'
import type { PoolClient, QueryResult } from 'pg'
import { Pool } from 'pg'

export type Deferred<T = void> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

/** A resolve/reject pair captured outside the executor, for coordinating ordering that isn't already implied by a Postgres row lock. */
export function defer<T = void>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

export type TxConnection = {
  query: (text: string, params?: unknown[]) => Promise<QueryResult>
  begin: () => Promise<void>
  commit: () => Promise<void>
  rollback: () => Promise<void>
  release: () => Promise<void>
}

function makeTxConnection(pool: Pool): Promise<TxConnection> {
  return pool.connect().then((client: PoolClient) => ({
    query: (text: string, params?: unknown[]) => client.query(text, params),
    begin: async () => {
      await client.query('BEGIN')
    },
    commit: async () => {
      await client.query('COMMIT')
    },
    rollback: async () => {
      await client.query('ROLLBACK')
    },
    release: async () => {
      client.release()
    },
  }))
}

/**
 * Opens two separate `pg.Pool`s — guaranteeing two distinct backend connections/PIDs — each
 * scoped to `schemaName` via `search_path`, wraps each in a raw-SQL `TxConnection`, runs `run`,
 * and always ends both pools afterward regardless of whether `run` throws.
 */
export async function withTwoConnections(
  schemaName: string,
  run: (a: TxConnection, b: TxConnection) => Promise<void>,
): Promise<void> {
  const searchPath = `${quotePgIdentifier(schemaName)},public`
  const poolA = new Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${searchPath}` })
  const poolB = new Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${searchPath}` })

  let connA: TxConnection | undefined
  let connB: TxConnection | undefined
  try {
    [connA, connB] = await Promise.all([makeTxConnection(poolA), makeTxConnection(poolB)])
    await run(connA, connB)
  } finally {
    await Promise.allSettled([connA?.release(), connB?.release()])
    await Promise.allSettled([poolA.end(), poolB.end()])
  }
}

/**
 * Extracts the real Postgres SQLSTATE code from an error, unwrapping drizzle-orm's
 * `DrizzleQueryError` (which wraps the underlying `pg` error in `.cause`, not on the error
 * itself) as well as a plain `pg` error thrown directly (e.g. from a raw `TxConnection.query`
 * call). Returns `undefined` if no pg error code can be found anywhere in the chain.
 */
export function pgErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined
  }

  if ('code' in error && typeof (error as { code: unknown }).code === 'string') {
    return (error as { code: string }).code
  }

  if ('cause' in error) {
    return pgErrorCode((error as { cause: unknown }).cause)
  }

  return undefined
}

/**
 * Issues `text` on `conn` without awaiting it — the caller decides when to await the returned
 * promise. This is what lets a test issue a statement expected to block on a Postgres row lock,
 * then unblock it later by committing/rolling back the other transaction that holds the lock.
 */
export function issuePending(
  conn: TxConnection,
  text: string,
  params?: unknown[],
): Promise<QueryResult> {
  return conn.query(text, params)
}
