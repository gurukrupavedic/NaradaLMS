import '@narada/env/load'

import { migrateAllSchoolSchemas, migratePublicSchema } from '@narada/db'
import { env } from '@narada/env'

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

const server = createServer()
runServer(server, { port: env.PORT })
