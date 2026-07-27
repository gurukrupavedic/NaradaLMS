import { describe, expect, it } from 'vitest'

import { ErrorCode, unprocessable } from '../error'
import { DbConstraint, translateDbError, translateKnownConstraint, withConstraintMapping } from './dbError'

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

  it('handles a wrapped (DrizzleQueryError-shaped) unique_violation via .cause', () => {
    const result = translateDbError({ cause: { code: '23505' } })
    expect(result?.statusCode).toBe(409)
    expect(result?.code).toBe(ErrorCode.RESOURCE_CONFLICT)
  })
})

describe('translateKnownConstraint', () => {
  const mapping = {
    [DbConstraint.batchTrackIdFk]: () => unprocessable('unknown or invalid track'),
  }

  it('maps a wrapped (DrizzleQueryError-shaped) known constraint', () => {
    const error = { cause: { code: '23503', constraint: DbConstraint.batchTrackIdFk } }
    const result = translateKnownConstraint(error, mapping)
    expect(result?.statusCode).toBe(422)
    expect(result?.message).toBe('unknown or invalid track')
  })

  it('maps a directly-shaped known constraint', () => {
    const error = { code: '23503', constraint: DbConstraint.batchTrackIdFk }
    const result = translateKnownConstraint(error, mapping)
    expect(result?.statusCode).toBe(422)
    expect(result?.message).toBe('unknown or invalid track')
  })

  it('returns null when the constraint is absent', () => {
    expect(translateKnownConstraint({ code: '23503' }, mapping)).toBeNull()
  })

  it('returns null when the constraint is present but not in the mapping', () => {
    const error = { code: '23503', constraint: 'some_other_fk' }
    expect(translateKnownConstraint(error, mapping)).toBeNull()
  })
})

describe('withConstraintMapping', () => {
  const mapping = {
    [DbConstraint.batchTrackIdFk]: () => unprocessable('unknown or invalid track'),
  }

  it('returns the operation result when it succeeds', async () => {
    await expect(withConstraintMapping(() => Promise.resolve('ok'), mapping)).resolves.toBe('ok')
  })

  it('throws the mapped AppError when the operation throws a known constraint', async () => {
    const error = { code: '23503', constraint: DbConstraint.batchTrackIdFk }
    await expect(withConstraintMapping(() => Promise.reject(error), mapping)).rejects.toMatchObject({
      statusCode: 422,
      message: 'unknown or invalid track',
    })
  })

  it('rethrows the original error unchanged when the constraint is unrecognized', async () => {
    const error = { code: '23503', constraint: 'some_other_fk' }
    await expect(withConstraintMapping(() => Promise.reject(error), mapping)).rejects.toBe(error)
  })
})
