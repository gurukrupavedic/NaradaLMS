import '@narada/env/load'
import { migratePublicSchema, shutdownPools } from '@narada/db'

try {
  await migratePublicSchema()
  console.log('Public schema migrations applied.')
} finally {
  await shutdownPools()
}
