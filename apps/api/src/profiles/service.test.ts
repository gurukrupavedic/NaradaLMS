import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDbClient, organization } from '@narada/db'

import type { AccessPolicy } from '../utils/accessPolicy'
import { deleteProfile, findById, searchProfiles, updateProfile } from './service'
import * as repository from './repository'
import type { Profile } from './schema'

// Explicit factory (rather than vitest's auto-mock) so the real `./repository` module — which
// pulls in `@narada/db` at import time and would trigger real env-var validation — never loads.
vi.mock('./repository', () => ({
  findById: vi.fn(),
  findByUserId: vi.fn(),
  findMembership: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
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
  typeof deleteProfile
>[0]['user']

function access(isSchoolAdmin: boolean): AccessPolicy {
  return { isSchoolAdmin: () => isSchoolAdmin } as unknown as AccessPolicy
}

const ownContext = { db, school, user, access: access(false) }
const adminContext = { db, school, user, access: access(true) }

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

describe('deleteProfile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('soft-deletes the caller\'s own profile (pure soft-delete, DD-011: only deletedAt changes)', async () => {
    vi.mocked(repository.softDelete).mockResolvedValue([{ id: 'profile-1' }])

    await expect(deleteProfile(ownContext, 'profile-1')).resolves.toBeUndefined()

    expect(repository.softDelete).toHaveBeenCalledWith(db, 'profile-1', 'user-1')
  })

  it('404s a missing, foreign-owned, or already-deactivated profile for a non-admin', async () => {
    vi.mocked(repository.softDelete).mockResolvedValue([])

    await expect(deleteProfile(ownContext, 'profile-1')).rejects.toMatchObject({ statusCode: 404 })
  })

  it('a school admin soft-deletes any profile, with no owner check (DD-011 §9)', async () => {
    vi.mocked(repository.softDelete).mockResolvedValue([{ id: 'profile-1' }])

    await expect(deleteProfile(adminContext, 'profile-1')).resolves.toBeUndefined()

    expect(repository.softDelete).toHaveBeenCalledWith(db, 'profile-1', null)
  })

  it('404s a missing or already-deactivated profile for an admin too', async () => {
    vi.mocked(repository.softDelete).mockResolvedValue([])

    await expect(deleteProfile(adminContext, 'profile-1')).rejects.toMatchObject({
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
      searchProfiles(ownContext, { query: 'ada', excludeBatchId: undefined }),
    ).resolves.toEqual(results)
    expect(repository.search).toHaveBeenCalledWith(db, { query: 'ada', excludeBatchId: undefined })
  })
})

describe('updateProfile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('delegates to repository.update, scoped to the caller as owner', async () => {
    const updated = { ...baseProfile, name: 'Ada Updated', email: 'ada@example.com' }
    vi.mocked(repository.update).mockResolvedValue(updated)

    await expect(
      updateProfile(ownContext, 'profile-1', { name: 'Ada Updated', email: 'ada@example.com' }),
    ).resolves.toEqual(updated)
    expect(repository.update).toHaveBeenCalledWith(db, 'profile-1', 'user-1', {
      name: 'Ada Updated',
      email: 'ada@example.com',
    })
  })

  it('404s a missing or foreign-owned profile for a non-admin', async () => {
    vi.mocked(repository.update).mockResolvedValue(undefined)

    await expect(updateProfile(ownContext, 'profile-1', { name: 'X' })).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('a school admin edits any profile, with no owner check', async () => {
    const updated = { ...baseProfile, name: 'Corrected Name' }
    vi.mocked(repository.update).mockResolvedValue(updated)

    await expect(
      updateProfile(adminContext, 'profile-1', { name: 'Corrected Name' }),
    ).resolves.toEqual(updated)
    expect(repository.update).toHaveBeenCalledWith(db, 'profile-1', null, {
      name: 'Corrected Name',
    })
  })

  it('404s a missing profile for an admin too', async () => {
    vi.mocked(repository.update).mockResolvedValue(undefined)

    await expect(updateProfile(adminContext, 'profile-1', { name: 'X' })).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})

describe('findById', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns the profile, registration-derived fields included', async () => {
    const withRegistrationFields = {
      ...baseProfile,
      email: 'ada@example.com',
      learningGoal: 'Fluency',
    }
    vi.mocked(repository.findById).mockResolvedValue(withRegistrationFields)

    await expect(findById(ownContext, 'profile-1')).resolves.toEqual(withRegistrationFields)
    expect(repository.findById).toHaveBeenCalledWith(db, 'profile-1')
  })

  it('404s a missing or soft-deleted profile', async () => {
    vi.mocked(repository.findById).mockResolvedValue(undefined)

    await expect(findById(ownContext, 'profile-1')).rejects.toMatchObject({ statusCode: 404 })
  })
})
