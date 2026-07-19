import cors from 'cors'
import express, { Router } from 'express'
import type { Express, NextFunction, Request, Response } from 'express'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import { Server } from 'http'
import { toNodeHandler } from 'better-auth/node'

import { auth } from '@narada/auth'
import { shutdownPools } from '@narada/db'
import { env } from '@narada/env'

import { AppError, ErrorCode } from './error'
import setupRoutes from './routes'
import { translateDbError } from './utils/dbError'

interface ServerOptions {
  port: number
}

const CORS_METHODS = ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
const SHUTDOWN_TIMEOUT_MS = 10_000

let shutdownExitStarted = false

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

export function createServer() {
  const router = Router()
  router.use(helmet())
  router.use(cors({ origin: env.TRUSTED_ORIGINS, credentials: true, methods: CORS_METHODS }))

  router.all('/auth/*splat', authRateLimit, toNodeHandler(auth))
  router.use(express.json())
  setupRoutes(router)

  const app = express()
  app.use(`/v${env.API_VERSION}`, router)
  app.use(handleErrors)
  return app
}

export function runServer(app: Express, options: ServerOptions) {
  const server = app.listen(options.port, () => {
    console.info(`Started rewrite HTTP server on port ${options.port}.`)
  })

  process.on('SIGINT', () => handleGracefulShutdown('SIGINT', server))
  process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM', server))
}

function handleErrors(error: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(error)
  const appError = error instanceof AppError ? error : translateDbError(error)
  if (appError) {
    res.status(appError.statusCode).json({
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.details === undefined ? {} : { details: appError.details }),
      },
    })
    return
  }

  if (!res.headersSent) {
    res.status(500).json({
      error: { code: ErrorCode.INTERNAL_ERROR, message: 'an unexpected error occurred.' },
    })
  }
}

function handleGracefulShutdown(signal: NodeJS.Signals, server: Server) {
  console.info(`Received ${signal}; shutting down rewrite server.`)
  server.close(error => {
    if (error) {
      console.error(error)
      void shutdownAndExit(1)
      return
    }

    void shutdownAndExit(0)
  })

  setTimeout(() => {
    console.error('Timed out while shutting down rewrite server.')
    void shutdownAndExit(1)
  }, SHUTDOWN_TIMEOUT_MS).unref()
}

async function shutdownAndExit(exitCode: number) {
  if (shutdownExitStarted) return
  shutdownExitStarted = true

  try {
    await shutdownPools()
  } catch (error) {
    console.error(error)
    exitCode = 1
  }

  process.exit(exitCode)
}
