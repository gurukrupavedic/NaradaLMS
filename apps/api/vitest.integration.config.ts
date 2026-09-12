import { defineConfig } from 'vitest/config'

import { requireTestDatabaseUrl } from './src/testing/testDatabaseUrl'

const databaseUrl = requireTestDatabaseUrl()

// @narada/env validates every one of these at import time (see packages/env/src/index.ts). The
// integration harness only needs @narada/db's DATABASE_URL to be real; the rest just need to
// satisfy the schema so importing @narada/db (which imports @narada/env) doesn't throw — none of
// these are read by the test/harness code itself.
const testEnv: Record<string, string> = {
  DATABASE_URL: databaseUrl,
  API_BASE_URL: 'http://localhost:3000',
  API_VERSION: '1',
  TRUSTED_ORIGINS: 'http://localhost:3000',
  AUTH_SECRET: 'integration-test-auth-secret-not-used-32-chars-min',
  GOOGLE_CLIENT_ID: 'integration-test-google-client-id',
  GOOGLE_CLIENT_SECRET: 'integration-test-google-client-secret',
  R2_ACCOUNT_ID: 'integration-test-r2-account-id',
  R2_ACCESS_KEY_ID: 'integration-test-r2-access-key-id',
  R2_SECRET_ACCESS_KEY: 'integration-test-r2-secret-access-key',
  R2_BUCKET_NAME: 'integration-test-bucket',
  NEXT_PUBLIC_API_URL: 'http://localhost:3000',
  NEXT_PUBLIC_SCHOOL_SLUG: 'integration-test-school',
}

// `test.env` only injects these into the worker/pool environment that runs test files — it does
// NOT reach the main Vitest process, which is where `globalSetup` runs. `globalSetup.ts` imports
// `@narada/db` (to migrate the public schema), so the main process needs these too; setting them
// directly on `process.env` here covers both (child fork processes inherit process.env at spawn).
Object.assign(process.env, testEnv)

export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    env: testEnv,
    globalSetup: ['./src/testing/globalSetup.ts'],
    pool: 'forks',
    // Vitest 4 dropped poolOptions.forks.singleFork; fileParallelism: false is the current way
    // to force every test file onto a single worker (it overrides maxWorkers to 1), which is
    // what the barrier/concurrency tests need — they open real, distinct Postgres connections and
    // must not race against unrelated test files sharing the same database.
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
})
