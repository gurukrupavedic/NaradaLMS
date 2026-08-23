import { Server } from 'http'
import express, { Router } from 'express'
import type { Express, Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
import { toNodeHandler } from 'better-auth/node'

import { auth } from '@narada/auth'
import { shutdownPools } from '@narada/db'
import { env } from '@narada/env'
import { attachRequestContext, getLogger } from './requestContext'
import setupRoutes from './routes'
import { AppError, ErrorCode } from './error'

interface ServerOptions {
  port: number
}

const SHUTDOWN_TIMEOUT_MS = 10_000
const CORS_METHODS = ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS']

// TRUSTED_ORIGINS entries may contain "*" to match Vercel preview deployments
// (e.g. "https://web-*-gurukrupa-vedic.vercel.app"), so origins are matched
// against each entry as a glob rather than with a plain array (which the
// `cors` package only matches exactly).
function isTrustedOrigin(origin: string) {
  return env.TRUSTED_ORIGINS.some(pattern => {
    if (!pattern.includes('*')) return pattern === origin
    const regex = new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`)
    return regex.test(origin)
  })
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

let shutdownStarted = false
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
  router.use(
    cors({
      origin(origin, callback) {
        callback(null, !origin || isTrustedOrigin(origin))
      },
      credentials: true,
      methods: CORS_METHODS,
    }),
  )
  router.use(attachRequestContext)
  router.use(logRequest)

  // BetterAuth requires access to the raw body stream, and thus,
  // must be mounted before the `express.json()` middleware.
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
    getLogger().info(`🚀 Started HTTP server on port ${options.port}.`)
  })

  process.on('SIGINT', () => handleGracefulShutdown('SIGINT', server))
  process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM', server))
  process.on('SIGUSR1', () => handleGracefulShutdown('SIGTERM', server))
  process.on('SIGUSR2', () => handleGracefulShutdown('SIGTERM', server))
}

function logRequest(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now()
  res.on('finish', () => {
    const details = {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    }

    const logger = getLogger()
    if (res.statusCode >= 500) {
      logger.error({ event: 'request.completed', ...details })
      return
    }

    if (res.statusCode >= 400) {
      logger.warn({ event: 'request.completed', ...details })
      return
    }

    logger.info({ event: 'request.completed', ...details })
  })

  next()
}

function handleErrors(error: Error, _req: Request, res: Response, _next: NextFunction) {
  getLogger().error({ event: 'request.error', err: error })
  if (error instanceof AppError) {
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

  if (!res.headersSent) {
    res.status(500).json({
      ok: false,
      error: { code: ErrorCode.INTERNAL_ERROR, message: 'an unexpected error occurred.' },
    })
  }
}

async function shutdownAndExit(exitCode: number) {
  const logger = getLogger()
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
  const logger = getLogger()
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
