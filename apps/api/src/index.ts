import { env } from '@narada/env'
import { createServer, runServer } from './server'

const server = createServer()
runServer(server, { port: env.PORT })
