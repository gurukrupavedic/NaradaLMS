import { Server } from 'http'
import express, { Express, Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import cors from 'cors'

import { env } from '@narada/env'
import logger from './logger'
import setupRoutes from './routes'

interface ServerOptions {
  port: number
}

export function createServer() {
  const app = express()
  app.use(helmet())
  app.use(cors({ origin: env.TRUSTED_ORIGINS, credentials: true }))
  app.use(express.json())
  setupRoutes(app)
  app.use(handleErrors)
  return app
}

export function runServer(app: Express, options: ServerOptions) {
  const server = app.listen(options.port, () => {
    logger.info(`🚀 Started HTTP server on port ${options.port}.`)
  })

  process.on('SIGINT', () => handleGracefulShutdown('SIGINT', server))
  process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM', server))
  process.on('SIGUSR1', () => handleGracefulShutdown('SIGTERM', server))
  process.on('SIGUSR2', () => handleGracefulShutdown('SIGTERM', server))
}

function handleErrors(error: Error, _req: Request, res: Response, next: NextFunction) {
  logger.error(error, 'An error occurred while handling a request.')
  if (!res.headersSent) {
    res.status(500).json({
      ok: false,
      data: {
        message: error.message,
      },
    })
  }

  next()
}

function handleGracefulShutdown(signal: string, server: Server) {
  logger.info(`${signal} signal received. Terminating the HTTP server.`)
  server.close(error => {
    if (error) {
      logger.error(error, 'Encountered an error when attempting to terminate the server.')
    }

    logger.info('Terminated the server.')
    process.exit(0)
  })
}
