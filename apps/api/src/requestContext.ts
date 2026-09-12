import { randomUUID } from 'crypto'
import type { NextFunction, Request, Response } from 'express'
import type { Logger } from 'pino'

import logger from './logger'

const REQUEST_ID_HEADER = 'x-request-id'

/**
 * Per-request logger, keyed the same way `naradaRoute.ts`'s `schoolCache`/`session.ts`'s
 * `sessionCache` already are — a `WeakMap<Request, _>` rather than `AsyncLocalStorage`, since
 * every caller here already has `req` in scope (this module has no deep-service consumer that
 * would need ambient access).
 */
const loggerCache = new WeakMap<Request, Logger>()

export function attachRequestContext(req: Request, res: Response, next: NextFunction) {
  const requestId = getRequestId(req)
  loggerCache.set(req, logger.child({ requestId }))
  res.setHeader(REQUEST_ID_HEADER, requestId)
  next()
}

/** Falls back to the base logger for code paths that run before `attachRequestContext` (or without a request at all, e.g. server startup). */
export function getLogger(req?: Request): Logger {
  if (!req) return logger
  return loggerCache.get(req) ?? logger
}

function getRequestId(req: Request): string {
  const value = req.get(REQUEST_ID_HEADER)?.trim()
  return value ? value : randomUUID()
}
