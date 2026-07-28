import { listSchoolSchemaOrganizationIds } from '@narada/db'

import { migratePublicSchema } from './migrate'
import { requireTestDatabaseUrl } from './testDatabaseUrl'

/**
 * Vitest `globalSetup`: runs once, in the main process, before any integration test file. By the
 * time individual test files import `@narada/db`, `DATABASE_URL` has already been injected as the
 * validated test URL via `vitest.integration.config.ts`'s `test.env` — this function re-validates
 * defensively (in case the config is ever invoked a different way) and applies public-schema
 * migrations exactly once for the whole run.
 */
export default async function setup(): Promise<void> {
  requireTestDatabaseUrl()
  await migratePublicSchema()

  const leftoverSchoolIds = await listSchoolSchemaOrganizationIds()
  if (leftoverSchoolIds.length > 0) {
    console.warn(
      `[globalSetup] ${leftoverSchoolIds.length} leftover school-* schema(s) found before this ` +
        'run started (likely from a previous failed run): ' +
        leftoverSchoolIds.join(', '),
    )
  }
}
