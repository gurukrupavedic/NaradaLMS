import { AsyncLocalStorage } from 'async_hooks'
import { randomUUID } from 'crypto'
import type { NextFunction, Request, Response } from 'express'
import type { Logger } from 'pino'

import logger from './logger'

const REQUEST_ID_HEADER = 'x-request-id'

type RequestContext = {
  requestId: string
  logger: Logger
  cache: Map<string, Promise<unknown>>
}

const requestContext = new AsyncLocalStorage<RequestContext>()

export function attachRequestContext(req: Request, res: Response, next: NextFunction) {
  const requestId = getRequestId(req)
  const requestLogger = logger.child({ requestId })

  res.setHeader(REQUEST_ID_HEADER, requestId)
  requestContext.run({ requestId, logger: requestLogger, cache: new Map() }, next)
}

export function getLogger(): Logger {
  const ctx = requestContext.getStore()
  return ctx?.logger ?? logger
}

export function getRequestCachedValue<T>(key: string, load: () => Promise<T>): Promise<T> {
  const ctx = requestContext.getStore()
  if (!ctx) return load()

  const cached = ctx.cache.get(key)
  if (cached) return cached as Promise<T>

  const promise = load().catch((error: unknown) => {
    ctx.cache.delete(key)
    throw error
  })
  ctx.cache.set(key, promise)
  return promise
}

function getRequestId(req: Request) {
  const value = req.get(REQUEST_ID_HEADER)?.trim()
  return value ? value : randomUUID()
}
