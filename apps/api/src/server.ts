import { Server } from 'http'
import express, { Router } from 'express'
import type { Express, Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { toNodeHandler } from 'better-auth/node'

import { auth } from '@narada/auth'
import { shutdownPools } from '@narada/db'
import { env } from '@narada/env'
import logger from './logger'
import { attachRequestContext, requestLogger } from './requestContext'
import setupRoutes from './routes'
import { AppError, ErrorCode } from './error'

interface ServerOptions {
  port: number
}

const SHUTDOWN_TIMEOUT_MS = 10_000
let shutdownStarted = false
let shutdownExitStarted = false

export function createServer() {
  const router = Router()
  router.use(helmet())
  router.use(cors({ origin: env.TRUSTED_ORIGINS, credentials: true }))
  router.use(attachRequestContext)
  router.use(logRequest)

  // BetterAuth requires access to the raw body stream, and thus,
  // must be mounted before the `express.json()` middleware.
  router.all('/auth/*splat', toNodeHandler(auth))
  router.use(express.json())
  setupRoutes(router)

  const app = express()
  app.use(`/v${env.API_VERSION}`, router)
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

function logRequest(req: Request, res: Response, next: NextFunction) {
  const scopedLogger = requestLogger()
  const startedAt = Date.now()

  res.on('finish', () => {
    const details = {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    }

    if (res.statusCode >= 500) {
      scopedLogger.error(details, 'handled request')
      return
    }

    if (res.statusCode >= 400) {
      scopedLogger.warn(details, 'handled request')
      return
    }

    scopedLogger.info(details, 'handled request')
  })
  next()
}

function handleErrors(error: Error, _req: Request, res: Response, _next: NextFunction) {
  const scopedLogger = requestLogger()
  if (error instanceof AppError) {
    const details = { err: error, statusCode: error.statusCode, code: error.code }
    if (error.statusCode >= 500) {
      scopedLogger.error(details, 'an error occurred while handling a request.')
    } else {
      scopedLogger.warn(details, 'request failed.')
    }

    res.status(error.statusCode).json({
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    })

    return
  }

  scopedLogger.error({ err: error }, 'an error occurred while handling a request.')
  if (!res.headersSent) {
    res.status(500).json({
      ok: false,
      error: { code: ErrorCode.INTERNAL_ERROR, message: 'an unexpected error occurred.' },
    })
  }
}

async function shutdownAndExit(exitCode: number) {
  if (shutdownExitStarted) return
  shutdownExitStarted = true

  try {
    await shutdownPools()
  } catch (error) {
    logger.error(error, 'encountered an error when closing database pools.')
    exitCode = 1
  }

  logger.info('terminated the server.')
  process.exit(exitCode)
}

function handleGracefulShutdown(signal: string, server: Server) {
  if (shutdownStarted) return
  shutdownStarted = true

  logger.info(`${signal} signal received -- terminating the HTTP server.`)
  const timeout = setTimeout(() => {
    logger.error({ timeoutMs: SHUTDOWN_TIMEOUT_MS }, 'timed out while terminating the server.')
    void shutdownAndExit(1)
  }, SHUTDOWN_TIMEOUT_MS)

  server.close(error => {
    clearTimeout(timeout)
    if (error) {
      logger.error(error, 'encountered an error when attempting to terminate the server.')
      void shutdownAndExit(1)
      return
    }

    void shutdownAndExit(0)
  })
}
