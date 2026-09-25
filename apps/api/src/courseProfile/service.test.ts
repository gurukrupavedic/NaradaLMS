import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDbClient } from '@narada/db'

import type { User } from '../session'
import type { AccessPolicy } from '../utils/accessPolicy'
import * as repository from './repository'
import { addToCounter, updateCourseProfile } from './service'

// Explicit factories so neither the real repository (which pulls in `@narada/db`) nor `@narada/db`
// itself loads — that would trigger real env-var validation.
vi.mock('./repository', () => ({
  findWritableProfile: vi.fn(),
  lock: vi.fn(),
  update: vi.fn(),
  addToCounter: vi.fn(),
}))
vi.mock('@narada/db', () => ({}))

// A transaction runs its callback against `tx`, so the assertions can check that the lock and the
// write both went through it rather than the outer `db`.
const tx = {} as SchoolDbClient
const db = {
  transaction: (run: (t: SchoolDbClient) => unknown) => run(tx),
} as unknown as SchoolDbClient
const user = { id: 'user-1', isSuperAdmin: false } as User

function access(isSchoolAdmin: boolean): AccessPolicy {
  return { isSchoolAdmin: () => isSchoolAdmin } as unknown as AccessPolicy
}

// SLMTS's Vedam course (`ved`) keeps a `japam` counter; RR's Puranokta declares nothing course-level.
const ved = { db, school: { slug: 'slmts' }, course: { id: 'course-ved', slug: 'ved' }, user }
const own = { ...ved, access: access(false) }
const admin = { ...ved, access: access(true) }
const rr = {
  db,
  school: { slug: 'rr' },
  course: { id: 'course-pur', slug: 'pur' },
  user,
  access: access(false),
}

beforeEach(() => {
  vi.resetAllMocks()
})

const stored = { learningGoal: null, currentProficiency: null, comments: null }

describe('updateCourseProfile', () => {
  it('lays the details patch over the locked details and writes the result, all in the one transaction', async () => {
    vi.mocked(repository.findWritableProfile).mockResolvedValue({ id: 'p1' })
    vi.mocked(repository.lock).mockResolvedValue({ ...stored, details: { japam: 100 } })
    vi.mocked(repository.update).mockResolvedValue({ ...stored, details: { japam: 40 } })

    await expect(updateCourseProfile(own, 'p1', { details: { japam: 40 } })).resolves.toEqual({
      ...stored,
      details: { japam: 40 },
    })

    expect(repository.findWritableProfile).toHaveBeenCalledWith(db, 'p1', 'user-1')
    expect(repository.lock).toHaveBeenCalledWith(tx, 'p1', 'course-ved')
    expect(repository.update).toHaveBeenCalledWith(tx, 'p1', 'course-ved', {
      details: { japam: 40 },
    })
  })

  it('writes the three columns as sent, leaving details alone when there is no details patch', async () => {
    vi.mocked(repository.findWritableProfile).mockResolvedValue({ id: 'p1' })
    vi.mocked(repository.lock).mockResolvedValue({ ...stored, details: { japam: 100 } })
    vi.mocked(repository.update).mockResolvedValue({
      ...stored,
      learningGoal: 'recite',
      details: { japam: 100 },
    })

    await updateCourseProfile(own, 'p1', { learningGoal: 'recite', currentProficiency: 'level1' })

    expect(repository.update).toHaveBeenCalledWith(tx, 'p1', 'course-ved', {
      learningGoal: 'recite',
      currentProficiency: 'level1',
    })
  })

  it('takes the columns in a course that declares no course-level details', async () => {
    vi.mocked(repository.findWritableProfile).mockResolvedValue({ id: 'p1' })
    vi.mocked(repository.lock).mockResolvedValue({ ...stored, details: {} })
    vi.mocked(repository.update).mockResolvedValue({ ...stored, comments: 'hi', details: {} })

    await updateCourseProfile(rr, 'p1', { comments: 'hi' })

    expect(repository.update).toHaveBeenCalledWith(tx, 'p1', 'course-pur', { comments: 'hi' })
  })

  it('lets a school admin edit anyone’s, with no owner check', async () => {
    vi.mocked(repository.findWritableProfile).mockResolvedValue({ id: 'p1' })
    vi.mocked(repository.lock).mockResolvedValue({ ...stored, details: {} })
    vi.mocked(repository.update).mockResolvedValue({ ...stored, details: { japam: 5 } })

    await updateCourseProfile(admin, 'p1', { details: { japam: 5 } })

    expect(repository.findWritableProfile).toHaveBeenCalledWith(db, 'p1', null)
  })

  it('404s someone else’s profile for a non-admin, and locks and writes nothing', async () => {
    vi.mocked(repository.findWritableProfile).mockResolvedValue(undefined)

    await expect(updateCourseProfile(own, 'p1', { details: { japam: 1 } })).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(repository.lock).not.toHaveBeenCalled()
  })

  it('refuses a key the course does not define, and a value the type does not allow, writing nothing', async () => {
    vi.mocked(repository.findWritableProfile).mockResolvedValue({ id: 'p1' })
    vi.mocked(repository.lock).mockResolvedValue({ ...stored, details: {} })

    await expect(
      updateCourseProfile(own, 'p1', { details: { gothram: 'A' } }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'details.gothram: is not a field for this school',
    })
    await expect(updateCourseProfile(own, 'p1', { details: { japam: -3 } })).rejects.toMatchObject({
      statusCode: 400,
      message: 'details.japam: must be a whole number, 0 or more',
    })
    expect(repository.update).not.toHaveBeenCalled()
  })
})

describe('addToCounter', () => {
  it('adds and reports the new total, for the owner', async () => {
    vi.mocked(repository.findWritableProfile).mockResolvedValue({ id: 'p1' })
    vi.mocked(repository.addToCounter).mockResolvedValue(216)

    await expect(addToCounter(own, 'p1', 'japam', 108)).resolves.toEqual({
      key: 'japam',
      total: 216,
    })

    expect(repository.findWritableProfile).toHaveBeenCalledWith(db, 'p1', 'user-1')
    expect(repository.addToCounter).toHaveBeenCalledWith(
      db,
      'p1',
      'course-ved',
      'japam',
      108,
      1_000_000_000,
    )
  })

  it('lets a school admin add for anyone', async () => {
    vi.mocked(repository.findWritableProfile).mockResolvedValue({ id: 'p1' })
    vi.mocked(repository.addToCounter).mockResolvedValue(1)

    await addToCounter(admin, 'p1', 'japam', 1)

    expect(repository.findWritableProfile).toHaveBeenCalledWith(db, 'p1', null)
  })

  it('is no such resource for a counter the course does not keep — before touching the database', async () => {
    await expect(addToCounter(rr, 'p1', 'japam', 1)).rejects.toMatchObject({ statusCode: 404 })
    await expect(addToCounter(own, 'p1', 'parayanam', 1)).rejects.toMatchObject({ statusCode: 404 })
    await expect(
      addToCounter({ ...own, course: { id: 'c', slug: 'other' } }, 'p1', 'japam', 1),
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(repository.findWritableProfile).not.toHaveBeenCalled()
  })

  it('404s someone else’s profile for a non-admin', async () => {
    vi.mocked(repository.findWritableProfile).mockResolvedValue(undefined)

    await expect(addToCounter(own, 'p1', 'japam', 1)).rejects.toMatchObject({ statusCode: 404 })
    expect(repository.addToCounter).not.toHaveBeenCalled()
  })

  it('422s an add that would take the total past the cap', async () => {
    vi.mocked(repository.findWritableProfile).mockResolvedValue({ id: 'p1' })
    vi.mocked(repository.addToCounter).mockResolvedValue(undefined)

    await expect(addToCounter(own, 'p1', 'japam', 1)).rejects.toMatchObject({
      statusCode: 422,
      message: "a count can't exceed 1000000000",
    })
  })
})
