import { z } from 'zod'
import type { Request } from 'express'

import { validationError } from '../error'

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw validationError()
  }

  return result.data
}

export function parseBody<T>(schema: z.ZodType<T>, req: Request): T {
  return parse(schema, req.body)
}

export function parseParams<T>(schema: z.ZodType<T>, req: Request): T {
  return parse(schema, req.params)
}

export function parseQuery<T>(schema: z.ZodType<T>, req: Request): T {
  return parse(schema, req.query)
}
