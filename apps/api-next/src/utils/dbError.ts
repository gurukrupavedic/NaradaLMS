import { AppError, conflict, unprocessable } from '../error'

// Postgres SQLSTATE codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
const UNIQUE_VIOLATION = '23505'
const FOREIGN_KEY_VIOLATION = '23503'

export function translateDbError(error: unknown): AppError | null {
  const code = getPgErrorCode(error)
  if (code === UNIQUE_VIOLATION) {
    return conflict('a resource with these values already exists')
  }

  if (code === FOREIGN_KEY_VIOLATION) {
    return unprocessable('referenced resource does not exist')
  }

  return null
}

function getPgErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined
  }

  const code = (error as { code: unknown }).code
  return typeof code === 'string' ? code : undefined
}
