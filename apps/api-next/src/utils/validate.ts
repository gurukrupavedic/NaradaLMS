import { z } from 'zod'

import { validationError } from '../error'

/** ISO-8601 instant with `Z` or an explicit offset (HARDENING_PLAN.md H6/DD-013) — rejects
 * offset-free timestamps, numbers, and non-instant strings; not accepted by `z.coerce.date()`. */
export const isoInstant = z.iso.datetime({ offset: true }).transform(value => new Date(value))

/** HTTPS-only URL with no embedded credentials (HARDENING_PLAN.md H6/DD-013). */
export const httpsUrl = z.url({ protocol: /^https$/ }).refine(value => {
  try {
    const url = new URL(value)
    return url.username === '' && url.password === ''
  } catch {
    return false
  }
}, 'meeting URL must not contain credentials')

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
