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
  findDetailsForUpdate: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
  search: vi.fn(),
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
  spokenLanguages: [],
  readLanguages: [],
  parentNames: [],
  dressCodeAgreed: false,
  noMeatAgreed: false,
  noAlcoholAgreed: false,
  noSmokingAgreed: false,
  details: {},
  updatedAt: new Date(),
  createdAt: new Date(),
}

describe('deleteProfile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('soft-deletes the caller\'s own profile (pure soft-delete: only deletedAt changes)', async () => {
    vi.mocked(repository.softDelete).mockResolvedValue([{ id: 'profile-1' }])

    await expect(deleteProfile(ownContext, 'profile-1')).resolves.toBeUndefined()

    expect(repository.softDelete).toHaveBeenCalledWith(db, 'profile-1', 'user-1')
  })

  it('404s a missing, foreign-owned, or already-deactivated profile for a non-admin', async () => {
    vi.mocked(repository.softDelete).mockResolvedValue([])

    await expect(deleteProfile(ownContext, 'profile-1')).rejects.toMatchObject({ statusCode: 404 })
  })

  it('a school admin soft-deletes any profile, with no owner check', async () => {
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

describe('updateProfile details', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  // A details edit runs in a transaction; `tx` stands in for the transaction-scoped client so the
  // assertions can check the lock and the write both went through it, not the outer `db`.
  const tx = {} as SchoolDbClient
  const slmts = {
    db: { transaction: (run: (t: SchoolDbClient) => unknown) => run(tx) } as unknown as SchoolDbClient,
    school: { slug: 'slmts' } as School,
    user,
    access: access(false),
  }
  const stored = { gothram: 'Bharadwaja', married: false, gothramMother: 'Vasishta' }

  it('merges the patch onto the stored details, in the same transaction that locked them', async () => {
    vi.mocked(repository.findDetailsForUpdate).mockResolvedValue(stored)
    vi.mocked(repository.update).mockResolvedValue(baseProfile)

    await updateProfile(slmts, 'profile-1', { details: { gothramMother: 'Kashyapa' } })

    expect(repository.findDetailsForUpdate).toHaveBeenCalledWith(tx, 'profile-1', 'user-1')
    expect(repository.update).toHaveBeenCalledWith(tx, 'profile-1', 'user-1', {
      details: { gothram: 'Bharadwaja', married: false, gothramMother: 'Kashyapa' },
    })
  })

  it('writes the details alongside column changes in the one update', async () => {
    vi.mocked(repository.findDetailsForUpdate).mockResolvedValue(stored)
    vi.mocked(repository.update).mockResolvedValue(baseProfile)

    await updateProfile(slmts, 'profile-1', { name: 'Ada', details: { gothram: 'Atreya' } })

    expect(repository.update).toHaveBeenCalledWith(tx, 'profile-1', 'user-1', {
      name: 'Ada',
      details: { gothram: 'Atreya', married: false, gothramMother: 'Vasishta' },
    })
  })

  it('requires the spouse gothram the moment married is ticked, and does not write without it', async () => {
    vi.mocked(repository.findDetailsForUpdate).mockResolvedValue(stored)

    await expect(updateProfile(slmts, 'profile-1', { details: { married: true } })).rejects.toMatchObject({
      statusCode: 400,
      message: 'details.gothramSpouse: is required',
    })
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('drops the spouse gothram when married is unticked', async () => {
    vi.mocked(repository.findDetailsForUpdate).mockResolvedValue({
      ...stored,
      married: true,
      gothramSpouse: 'Kashyapa',
    })
    vi.mocked(repository.update).mockResolvedValue(baseProfile)

    await updateProfile(slmts, 'profile-1', { details: { married: false } })

    expect(repository.update).toHaveBeenCalledWith(tx, 'profile-1', 'user-1', { details: stored })
  })

  it('lets a profile that predates the required fields change one of them without answering the rest', async () => {
    vi.mocked(repository.findDetailsForUpdate).mockResolvedValue({})
    vi.mocked(repository.update).mockResolvedValue(baseProfile)

    await updateProfile(slmts, 'profile-1', { details: { gothramMother: 'Vasishta' } })

    expect(repository.update).toHaveBeenCalledWith(tx, 'profile-1', 'user-1', {
      details: { married: false, gothramMother: 'Vasishta' },
    })
  })

  it('refuses to blank a required field it is being asked to write', async () => {
    vi.mocked(repository.findDetailsForUpdate).mockResolvedValue(stored)

    await expect(updateProfile(slmts, 'profile-1', { details: { gothram: '  ' } })).rejects.toMatchObject({
      statusCode: 400,
      message: 'details.gothram: is required',
    })
  })

  it('carries a stored key its school no longer defines through an edit untouched', async () => {
    vi.mocked(repository.findDetailsForUpdate).mockResolvedValue({ ...stored, retiredField: 'kept' })
    vi.mocked(repository.update).mockResolvedValue(baseProfile)

    await updateProfile(slmts, 'profile-1', { details: { gothram: 'Atreya' } })

    expect(repository.update).toHaveBeenCalledWith(tx, 'profile-1', 'user-1', {
      details: { retiredField: 'kept', gothram: 'Atreya', married: false, gothramMother: 'Vasishta' },
    })
  })

  it('rejects a key the school does not define', async () => {
    vi.mocked(repository.findDetailsForUpdate).mockResolvedValue(stored)

    await expect(updateProfile(slmts, 'profile-1', { details: { favouriteColour: 'red' } })).rejects.toMatchObject({
      statusCode: 400,
      message: 'details.favouriteColour: is not a field for this school',
    })
  })

  it('404s when the row to lock is missing, foreign-owned, or deactivated', async () => {
    vi.mocked(repository.findDetailsForUpdate).mockResolvedValue(undefined)

    await expect(updateProfile(slmts, 'profile-1', { details: { gothram: 'A' } })).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(repository.update).not.toHaveBeenCalled()
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
