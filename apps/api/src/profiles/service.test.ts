import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDbClient, organization } from '@narada/db'

import { deactivateByAdmin, deleteById, findById, searchProfiles, updateProfile } from './service'
import * as repository from './repository'
import type { Profile } from './schema'

// Explicit factory (rather than vitest's auto-mock) so the real `./repository` module — which
// pulls in `@narada/db` at import time and would trigger real env-var validation — never loads.
vi.mock('./repository', () => ({
  findById: vi.fn(),
  findByUserId: vi.fn(),
  findMembership: vi.fn(),
  insert: vi.fn(),
  updateOwned: vi.fn(),
  softDeleteOwned: vi.fn(),
  softDeleteById: vi.fn(),
  search: vi.fn(),
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

const baseProfile: Profile = {
  id: 'profile-1',
  userId: 'user-1',
  name: 'Ada',
  phone: null,
  city: null,
  email: null,
  yearOfBirth: null,
  state: null,
  country: null,
  countryTimeZone: null,
  learningGoal: null,
  currentProficiency: null,
  spokenLanguages: [],
  readLanguages: [],
  parentNames: [],
  dressCodeAgreed: false,
  noMeatAgreed: false,
  noAlcoholAgreed: false,
  noSmokingAgreed: false,
  comments: null,
  updatedAt: new Date(),
  createdAt: new Date(),
}

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

describe('searchProfiles', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('delegates straight through to the repository', async () => {
    const results = [baseProfile]
    vi.mocked(repository.search).mockResolvedValue(results)

    await expect(
      searchProfiles(context, { query: 'ada', excludeBatchId: undefined }),
    ).resolves.toEqual(results)
    expect(repository.search).toHaveBeenCalledWith(db, { query: 'ada', excludeBatchId: undefined })
  })
})

describe('updateProfile (student self-edit)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('delegates to repository.updateOwned, scoped to the caller as owner', async () => {
    const updated = { ...baseProfile, name: 'Ada Updated', email: 'ada@example.com' }
    vi.mocked(repository.updateOwned).mockResolvedValue(updated)

    await expect(
      updateProfile(context, 'profile-1', { name: 'Ada Updated', email: 'ada@example.com' }),
    ).resolves.toEqual(updated)
    expect(repository.updateOwned).toHaveBeenCalledWith(db, 'profile-1', 'user-1', {
      name: 'Ada Updated',
      email: 'ada@example.com',
    })
  })

  it('404s a missing or foreign-owned profile', async () => {
    vi.mocked(repository.updateOwned).mockResolvedValue(undefined)

    await expect(updateProfile(context, 'profile-1', { name: 'X' })).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})

describe('findById', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns the profile, registration-derived fields included', async () => {
    const withRegistrationFields = { ...baseProfile, email: 'ada@example.com', learningGoal: 'Fluency' }
    vi.mocked(repository.findById).mockResolvedValue(withRegistrationFields)

    await expect(findById(context, 'profile-1')).resolves.toEqual(withRegistrationFields)
    expect(repository.findById).toHaveBeenCalledWith(db, 'profile-1')
  })

  it('404s a missing or soft-deleted profile', async () => {
    vi.mocked(repository.findById).mockResolvedValue(undefined)

    await expect(findById(context, 'profile-1')).rejects.toMatchObject({ statusCode: 404 })
  })
})
