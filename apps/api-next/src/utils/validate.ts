import { z } from 'zod'

import { validationError } from '../error'

export function requireNonEmpty<T extends z.ZodObject>(schema: T) {
  return schema.refine(data => Object.values(data).some(v => v !== undefined && v !== ''), {
    message: 'no fields to update',
  })
}

export async function parse<T extends z.ZodType>(schema: T, data: unknown): Promise<z.output<T>> {
  const result = await schema.safeParseAsync(data)
  if (!result.success) {
    throw validationError(undefined, result.error.issues)
  }

  return result.data
}
