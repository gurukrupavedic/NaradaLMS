import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDbClient, organization } from '@narada/db'

import { DbConstraint } from '../utils/dbError'
import { deleteById } from './service'
import * as repository from './repository'

// Explicit factory (rather than vitest's auto-mock) so the real `./repository` module — which
// pulls in `@narada/db` at import time and would trigger real env-var validation — never loads.
vi.mock('./repository', () => ({
  findByUserId: vi.fn(),
  findMembership: vi.fn(),
  insert: vi.fn(),
  updateOwned: vi.fn(),
  deleteOwned: vi.fn(),
}))

// `profiles/service.ts` imports the real `publicDb` value directly from `@narada/db`, so that
// package needs its own stub too — loading the real one triggers `@narada/env`'s validation
// against unset environment variables in this test environment.
vi.mock('@narada/db', () => ({
  publicDb: {},
}))

type School = typeof organization.$inferSelect

const db = {} as SchoolDbClient
const school = {} as School
const user = { id: 'user-1', isSuperAdmin: false } as unknown as Parameters<
  typeof deleteById
>[0]['user']
const context = { db, school, user }

describe('deleteById', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('maps evaluation_evaluatorId_profile_id_fk to a 409 conflict', async () => {
    vi.mocked(repository.deleteOwned).mockRejectedValue({
      cause: { code: '23503', constraint: DbConstraint.evaluationEvaluatorIdFk },
    })

    await expect(deleteById(context, 'profile-1')).rejects.toMatchObject({
      statusCode: 409,
      message: 'profile is still referenced by an evaluation and cannot be deleted',
    })
  })

  it('deletes normally when there are no blocking references', async () => {
    vi.mocked(repository.deleteOwned).mockResolvedValue([{ id: 'profile-1' }])

    await expect(deleteById(context, 'profile-1')).resolves.toBeUndefined()
  })

  it('rethrows an unrecognized constraint violation unchanged', async () => {
    const original = { cause: { code: '23503', constraint: 'some_other_fk' } }
    vi.mocked(repository.deleteOwned).mockRejectedValue(original)

    await expect(deleteById(context, 'profile-1')).rejects.toBe(original)
  })
})
