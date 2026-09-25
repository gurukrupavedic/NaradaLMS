import { z } from 'zod'

import { validationError } from '../error'

/** ISO-8601 instant with `Z` or an explicit offset — rejects
 * offset-free timestamps, numbers, and non-instant strings; not accepted by `z.coerce.date()`. */
export const isoInstant = z.iso.datetime({ offset: true }).transform(value => new Date(value))

/** E.164 phone number — matches the `phoneNumberValidator` on the OTP-auth `phoneNumber` plugin
 * config (packages/auth/src/index.ts) exactly, so nothing accepted here fails validation at sign-in. */
export const e164Phone = z.string().regex(/^\+[1-9]\d{7,14}$/, 'phone must be in E.164 format')

/** HTTPS-only URL with no embedded credentials. */
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
    // Leaving `message` undefined falls back to `AppError`'s own default, the bare error code
    // ("VALIDATION_FAILED") — the real reason was always sitting in `details` but never reached
    // the caller. The first issue is usually the whole story; `path` is empty for a schema-level
    // refine (e.g. `requireNonEmpty`), so it's only prefixed when there's actually a field to name.
    const [firstIssue] = result.error.issues
    const message = firstIssue
      ? firstIssue.path.length > 0
        ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
        : firstIssue.message
      : 'validation failed'
    throw validationError(message, result.error.issues)
  }

  return result.data
}
