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

import { AppError, ErrorCode, badRequest } from './error'
import { attachRequestContext, getLogger } from './requestContext'
import setupRoutes from './routes'
import { createDeviceLinkRateLimit, createSendOtpRateLimit, isTrustedOrigin } from './utils/serverSecurity'
import { translateDbError } from './utils/dbError'

interface ServerOptions {
  port: number
}

const CORS_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
const SHUTDOWN_TIMEOUT_MS = 10_000

let shutdownStarted = false
let shutdownExitStarted = false

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

const sendOtpRateLimit = createSendOtpRateLimit()
const deviceLinkRateLimit = createDeviceLinkRateLimit()

export function createServer() {
  const router = Router()
  router.use(helmet())
  router.use(
    cors({
      origin(origin, callback) {
        callback(null, !origin || isTrustedOrigin(origin, env.TRUSTED_ORIGINS))
      },
      credentials: true,
      methods: CORS_METHODS,
    }),
  )
  router.use(attachRequestContext)
  router.use(logRequest)

  // BetterAuth requires access to the raw body stream, and thus, must be mounted before the
  // general `express.json()` middleware — except send-otp, which needs the parsed phone number to
  // key its rate limit. better-auth's node handler falls back to re-serializing `req.body` when
  // the raw stream has already been consumed, so parsing it here first is safe.
  router.post(
    '/auth/phone-number/send-otp',
    express.json(),
    authRateLimit,
    sendOtpRateLimit,
    toNodeHandler(auth),
  )
  // Both IP-keyed only (no body field to read), so — unlike send-otp above — neither needs
  // express.json() ahead of its rate limiter.
  router.post('/auth/device-link/start', authRateLimit, deviceLinkRateLimit, toNodeHandler(auth))
  router.post('/auth/device-link/approve', authRateLimit, deviceLinkRateLimit, toNodeHandler(auth))
  router.all('/auth/*splat', authRateLimit, toNodeHandler(auth))
  router.use(express.json())
  setupRoutes(router)
  router.use(handleUnmatchedRoute)

  const app = express()
  // Railway (.github/workflows/deploy-api*.yml) fronts this service with exactly one reverse
  // proxy hop, which appends its own X-Forwarded-For entry. Express ignores that header by
  // default ("trust proxy" is false), so req.ip falls back to the immediate socket peer — Railway's
  // own edge address, the same for every request regardless of who's actually calling. That
  // collapses every IP-keyed rate limiter (createDeviceLinkRateLimit, the IP fallback in
  // sendOtpRateLimitKey) into one shared bucket across the whole user base instead of one per
  // caller. `1` trusts exactly that one hop — not `true`, which would trust an unbounded chain and
  // let a client spoof its own X-Forwarded-For to bypass IP-based limiting entirely.
  app.set('trust proxy', 1)
  app.use(`/v${env.API_VERSION}`, router)
  app.use(handleErrors)
  return app
}

export function runServer(app: Express, options: ServerOptions) {
  const server = app.listen(options.port, () => {
    getLogger().info(`Started rewrite HTTP server on port ${options.port}.`)
  })

  process.on('SIGINT', () => handleGracefulShutdown('SIGINT', server))
  process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM', server))
  process.on('SIGUSR1', () => handleGracefulShutdown('SIGUSR1', server))
  process.on('SIGUSR2', () => handleGracefulShutdown('SIGUSR2', server))
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

    const logger = getLogger(req)
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

function handleUnmatchedRoute(req: Request, res: Response) {
  res.status(404).json({
    ok: false,
    error: { code: ErrorCode.RESOURCE_NOT_FOUND, message: 'route not found' },
  })
}

/**
 * `express.json()` (via `body-parser`) rejects unparseable JSON with the original `SyntaxError`
 * decorated by `http-errors` — `status: 400`, `type: 'entity.parse.failed'` — rather than an
 * `AppError`.
 */
function isBodyParserSyntaxError(error: unknown): error is SyntaxError & { type?: string } {
  return error instanceof SyntaxError && (error as { type?: string }).type === 'entity.parse.failed'
}

function handleErrors(error: Error, req: Request, res: Response, _next: NextFunction) {
  getLogger(req).error({ event: 'request.error', err: error })

  const appError =
    error instanceof AppError
      ? error
      : (translateDbError(error) ??
        (isBodyParserSyntaxError(error) ? badRequest('malformed JSON body') : null))
  if (appError) {
    res.status(appError.statusCode).json({
      ok: false,
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
      ok: false,
      error: { code: ErrorCode.INTERNAL_ERROR, message: 'an unexpected error occurred.' },
    })
  }
}

function handleGracefulShutdown(signal: string, server: Server) {
  const logger = getLogger()
  if (shutdownStarted) return
  shutdownStarted = true

  logger.info(`${signal} signal received -- terminating the rewrite HTTP server.`)
  const timeout = setTimeout(() => {
    logger.error({ timeoutMs: SHUTDOWN_TIMEOUT_MS }, 'timed out while terminating the rewrite server.')
    void shutdownAndExit(1)
  }, SHUTDOWN_TIMEOUT_MS)

  server.close(error => {
    clearTimeout(timeout)
    if (error) {
      logger.error(error, 'encountered an error when attempting to terminate the rewrite server.')
      void shutdownAndExit(1)
      return
    }

    void shutdownAndExit(0)
  })
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

  logger.info('terminated the rewrite server.')
  process.exit(exitCode)
}
