import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDbClient, organization } from '@narada/db'

import { deactivateByAdmin, deleteById } from './service'
import * as repository from './repository'

// Explicit factory (rather than vitest's auto-mock) so the real `./repository` module — which
// pulls in `@narada/db` at import time and would trigger real env-var validation — never loads.
vi.mock('./repository', () => ({
  findByUserId: vi.fn(),
  findMembership: vi.fn(),
  insert: vi.fn(),
  updateOwned: vi.fn(),
  softDeleteOwned: vi.fn(),
  softDeleteById: vi.fn(),
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

  it('soft-deletes the profile (pure soft-delete, DD-011: only deletedAt changes)', async () => {
    vi.mocked(repository.softDeleteOwned).mockResolvedValue([{ id: 'profile-1' }])

    await expect(deleteById(context, 'profile-1')).resolves.toBeUndefined()

    expect(repository.softDeleteOwned).toHaveBeenCalledWith(db, 'profile-1', 'user-1')
  })

  it('404s a missing, foreign-owned, or already-deactivated profile', async () => {
    vi.mocked(repository.softDeleteOwned).mockResolvedValue([])

    await expect(deleteById(context, 'profile-1')).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('deactivateByAdmin (DD-011 §9)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('soft-deletes the target profile without an owner check (authorization already done in the route)', async () => {
    vi.mocked(repository.softDeleteById).mockResolvedValue([{ id: 'profile-1' }])

    await expect(deactivateByAdmin(context, 'profile-1')).resolves.toBeUndefined()

    expect(repository.softDeleteById).toHaveBeenCalledWith(db, 'profile-1')
  })

  it('404s a missing or already-deactivated profile', async () => {
    vi.mocked(repository.softDeleteById).mockResolvedValue([])

    await expect(deactivateByAdmin(context, 'profile-1')).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})
