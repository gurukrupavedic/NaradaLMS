import '@narada/env/load'
import { migratePublicSchema, shutdownPools } from '@narada/db'

import { migrateSchools } from './schoolsMigration'

/**
 * The deploy-time migration entry point (`deploy-api-staging.yml`/`deploy-api.yml`), run via
 * `railway run` so it inherits the target environment's own `DATABASE_URL` (and nothing else —
 * see those workflows' own comments) rather than needing its secrets duplicated into GitHub
 * Actions.
 *
 * Deliberately bypasses `schools migrate`'s interactive super-admin-phone prompt: that check
 * exists so a human operator's identity is on record when they run a rare, by-hand operation
 * (`provisioning.ts`'s own doc comment: the real authorization boundary is already having shell
 * access — DATABASE_URL, decrypted .env). A CI job isn't a human operator; its authorization
 * boundary is already "this workflow holds `RAILWAY_TOKEN`," so gating it on a phone number would
 * just mean inventing an identity to satisfy a check that doesn't apply, rather than adding any
 * real safety. Always migrates every school, unconditionally — a deploy never wants a partial or
 * dry-run migration.
 */
try {
  await migratePublicSchema()
  console.log('Public schema migrations applied.')
  await migrateSchools({ dryRun: false })
} finally {
  await shutdownPools()
}
