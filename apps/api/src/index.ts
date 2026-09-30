import '@narada/env/load'

import { migrateAllSchoolSchemas, migratePublicSchema } from '@narada/db'
import { env } from '@narada/env'

import { startDocChapterWorker } from './docChapters/worker'
import logger from './logger'
import { createServer, runServer } from './server'

// Applied on every boot, before the server opens its port — see `migrateAllSchoolSchemas`'s own
// doc comment for why this runs here rather than as a separate deploy-pipeline step: nothing
// outside Railway's own network can reach a service's Postgres to run it there instead. A failure
// here throws out of this top-level await and crashes the process before any traffic is served,
// which is the point — Railway's health check then fails and the previous deploy keeps serving,
// rather than the new code running against a schema it doesn't match.
await migratePublicSchema()
const migratedSchools = await migrateAllSchoolSchemas()
logger.info({ event: 'startup.migrated', schools: migratedSchools.length }, 'applied pending database migrations')

// In-process — no separate deployed worker service. Same container, same lifecycle as the HTTP
// server: `onShutdown` below is awaited inside the server's own shutdown sequence, before
// `process.exit()`, so an in-flight parse gets to finish (or fail and retry) instead of being
// killed mid-job.
const docChapterWorker = startDocChapterWorker()

const server = createServer()
runServer(server, { port: env.PORT, onShutdown: () => docChapterWorker.close() })
