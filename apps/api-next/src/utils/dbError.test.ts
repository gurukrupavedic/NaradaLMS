import { describe, expect, it } from 'vitest'

import { ErrorCode } from '../error'
import { translateDbError } from './dbError'

describe('translateDbError', () => {
  it('maps a unique_violation (23505) to a 409 conflict', () => {
    const result = translateDbError({ code: '23505' })
    expect(result?.statusCode).toBe(409)
    expect(result?.code).toBe(ErrorCode.RESOURCE_CONFLICT)
  })

  it('maps a foreign_key_violation (23503) to a 422 unprocessable', () => {
    const result = translateDbError({ code: '23503' })
    expect(result?.statusCode).toBe(422)
    expect(result?.code).toBe(ErrorCode.UNPROCESSABLE_INPUT)
  })

  it('returns null for an unrecognized pg error code', () => {
    expect(translateDbError({ code: '42601' })).toBeNull()
  })

  it('returns null for a non-pg error', () => {
    expect(translateDbError(new Error('boom'))).toBeNull()
    expect(translateDbError('not an error object')).toBeNull()
    expect(translateDbError(null)).toBeNull()
  })
})
