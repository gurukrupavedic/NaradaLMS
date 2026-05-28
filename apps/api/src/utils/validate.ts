import { z } from 'zod'
import type { Request } from 'express'

import { validationError } from '../error'

export function requireNonEmpty<T extends z.core.$ZodShape>(schema: z.ZodObject<T>) {
  return schema.refine(data => Object.keys(data).length > 0, { message: 'no fields to update' })
}

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw validationError(undefined, result.error.issues)
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
