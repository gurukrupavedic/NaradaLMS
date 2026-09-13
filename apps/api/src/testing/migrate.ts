import { createRequire } from 'node:module'
import path from 'node:path'

import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

/**
 * Resolves `packages/db/drizzle/<kind>` relative to the installed `@narada/db` package rather
 * than a hardcoded relative path from this file, so it keeps working regardless of where in the
 * workspace `apps/api` sits. `@narada/db`'s package.json exports `"."` as `./src/index.ts`
 * (no `./package.json` subpath is exported), so resolve the package entrypoint and walk up from
 * there instead of resolving `@narada/db/package.json` directly.
 */
export function resolveMigrationsFolder(kind: 'public' | 'school'): string {
  const require = createRequire(import.meta.url)
  const entrypoint = require.resolve('@narada/db') // .../packages/db/src/index.ts
  const packageRoot = path.resolve(path.dirname(entrypoint), '..') // .../packages/db
  return path.join(packageRoot, 'drizzle', kind)
}

/**
 * Applies every public-schema migration to `process.env.DATABASE_URL` (expected to already be
 * pointed at the test database by the caller — see `testDatabaseUrl.ts`/`globalSetup.ts`).
 * Idempotent: drizzle's migrator records applied migrations in a `drizzle`-schema tracking table,
 * so re-running against an already-migrated database is a no-op.
 */
export async function migratePublicSchema(): Promise<void> {
  const migrationsFolder = resolveMigrationsFolder('public')
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: '-c search_path=public',
  })

  try {
    const db = drizzle(pool)
    await migrate(db, { migrationsFolder })
  } finally {
    await pool.end()
  }
}
