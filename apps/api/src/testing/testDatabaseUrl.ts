/**
 * Guards the integration harness against ever pointing at a non-test database. This is
 * deliberately independent of `@narada/env` — it must be evaluatable before `DATABASE_URL` (the
 * variable `@narada/db` actually reads) is injected, and it enforces a stronger invariant
 * (`..._test` suffix) than `@narada/env`'s plain `z.url()` check.
 */

/** Parses `url` and returns its database name: the pathname with the leading slash stripped and no query string. */
export function databaseNameOf(url: string): string {
  const parsed = new URL(url)
  return parsed.pathname.replace(/^\//, '')
}

/**
 * Reads and validates `process.env.TEST_DATABASE_URL`, throwing a descriptive error unless it is
 * set, a parseable URL, and names a database ending in `_test`. Never returns an unsafe value —
 * every caller (globalSetup, vitest.integration.config.ts) can treat a returned string as safe to
 * hand to `@narada/db` as `DATABASE_URL`.
 */
export function requireTestDatabaseUrl(): string {
  const raw = process.env.TEST_DATABASE_URL
  if (!raw || raw.trim() === '') {
    throw new Error(
      'TEST_DATABASE_URL is not set. The integration suite requires a dedicated Postgres ' +
        'test database, e.g. TEST_DATABASE_URL=postgresql://narada:narada@localhost:5432/narada_test',
    )
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error(`TEST_DATABASE_URL is not a valid URL: ${raw}`)
  }

  const databaseName = parsed.pathname.replace(/^\//, '')
  if (!/_test$/.test(databaseName)) {
    throw new Error(
      `TEST_DATABASE_URL must name a database ending in "_test" (got "${databaseName}") — ` +
        'this guard exists so the integration suite can never accidentally run against a ' +
        'development or production database.',
    )
  }

  return raw
}
