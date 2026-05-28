import { AsyncLocalStorage } from 'async_hooks'
import { randomUUID } from 'crypto'
import type { NextFunction, Request, Response } from 'express'
import type { Logger } from 'pino'

import logger from './logger'

const REQUEST_ID_HEADER = 'x-request-id'

type RequestContext = {
  requestId: string
  logger: Logger
}

const requestContext = new AsyncLocalStorage<RequestContext>()

export function attachRequestContext(req: Request, res: Response, next: NextFunction) {
  const requestId = getRequestId(req)
  const requestLogger = logger.child({ requestId })

  res.setHeader(REQUEST_ID_HEADER, requestId)
  requestContext.run({ requestId, logger: requestLogger }, next)
}

export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore()
}

export function requestLogger(): Logger {
  return getRequestContext()?.logger ?? logger
}

function getRequestId(req: Request) {
  const value = req.get(REQUEST_ID_HEADER)?.trim()
  return value ? value : randomUUID()
}
