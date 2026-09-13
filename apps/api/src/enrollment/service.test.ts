import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDb } from '@narada/db'

import { assertStudentEnrolledInBatch, enroll, resolveQualifyingBatch, unenroll } from './service'
import * as repository from './repository'

// Explicit factory (rather than vitest's auto-mock) so the real `./repository` module — which
// pulls in `@narada/db` at import time and would trigger real env-var validation — never loads.
vi.mock('./repository', () => ({
  findQualifyingBatches: vi.fn(),
  findEnrollment: vi.fn(),
  profileExists: vi.fn(),
  insertEnrollment: vi.fn(),
  deleteEnrollment: vi.fn(),
}))

describe('resolveQualifyingBatch', () => {
  const db = {} as SchoolDb

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns the batchId when exactly one batch qualifies', async () => {
    vi.mocked(repository.findQualifyingBatches).mockResolvedValue([{ batchId: 'batch-1' }])

    await expect(resolveQualifyingBatch(db, 'student-1', 'track-1')).resolves.toBe('batch-1')
    expect(repository.findQualifyingBatches).toHaveBeenCalledWith(db, 'student-1', 'track-1')
  })

  it('rejects with a 422 when no batch qualifies', async () => {
    vi.mocked(repository.findQualifyingBatches).mockResolvedValue([])

    await expect(resolveQualifyingBatch(db, 'student-1', 'track-1')).rejects.toMatchObject({
      statusCode: 422,
      message: 'student is not enrolled in a batch for this chapter',
    })
  })

  it('rejects with a 422 when more than one batch qualifies, rather than silently picking one', async () => {
    vi.mocked(repository.findQualifyingBatches).mockResolvedValue([
      { batchId: 'batch-1' },
      { batchId: 'batch-2' },
    ])

    await expect(resolveQualifyingBatch(db, 'student-1', 'track-1')).rejects.toMatchObject({
      statusCode: 422,
      message: "student is enrolled in multiple batches for this chapter's track",
    })
  })
})

describe('assertStudentEnrolledInBatch', () => {
  const db = {} as SchoolDb

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('resolves when the target holds a student enrollment in this exact batch', async () => {
    vi.mocked(repository.findEnrollment).mockResolvedValue({ role: 'student' })

    await expect(
      assertStudentEnrolledInBatch(db, 'student-1', 'batch-1'),
    ).resolves.toBeUndefined()
    expect(repository.findEnrollment).toHaveBeenCalledWith(db, 'student-1', 'batch-1')
  })

  it('rejects with a 422 when there is no enrollment in this batch at all', async () => {
    vi.mocked(repository.findEnrollment).mockResolvedValue(undefined)

    await expect(
      assertStudentEnrolledInBatch(db, 'student-1', 'batch-1'),
    ).rejects.toMatchObject({ statusCode: 422, message: 'student is not enrolled in this batch' })
  })

  it('rejects with a 422 when the target is enrolled in this batch as instructor/ta, not student', async () => {
    vi.mocked(repository.findEnrollment).mockResolvedValue({ role: 'instructor' })

    await expect(
      assertStudentEnrolledInBatch(db, 'student-1', 'batch-1'),
    ).rejects.toMatchObject({ statusCode: 422, message: 'student is not enrolled in this batch' })
  })
})

describe('enroll', () => {
  const db = {} as SchoolDb

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('adds the profile to the roster when it exists and is not already enrolled', async () => {
    vi.mocked(repository.profileExists).mockResolvedValue(true)
    vi.mocked(repository.findEnrollment).mockResolvedValue(undefined)
    const row = {
      profileId: 'profile-1',
      batchId: 'batch-1',
      role: 'student' as const,
      status: 'active' as const,
      joinedAt: new Date(),
      leftDate: null,
    }
    vi.mocked(repository.insertEnrollment).mockResolvedValue(row)

    await expect(
      enroll(db, 'batch-1', { profileId: 'profile-1', role: 'student' }),
    ).resolves.toEqual(row)
  })

  it('rejects with 404 when the target profile does not exist', async () => {
    vi.mocked(repository.profileExists).mockResolvedValue(false)

    await expect(
      enroll(db, 'batch-1', { profileId: 'profile-1', role: 'student' }),
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(repository.insertEnrollment).not.toHaveBeenCalled()
  })

  it('rejects with 409 when the profile is already enrolled in this batch', async () => {
    vi.mocked(repository.profileExists).mockResolvedValue(true)
    vi.mocked(repository.findEnrollment).mockResolvedValue({ role: 'student' })

    await expect(
      enroll(db, 'batch-1', { profileId: 'profile-1', role: 'student' }),
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(repository.insertEnrollment).not.toHaveBeenCalled()
  })
})

describe('unenroll', () => {
  const db = {} as SchoolDb

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('resolves when a row was deleted', async () => {
    vi.mocked(repository.deleteEnrollment).mockResolvedValue(true)

    await expect(unenroll(db, 'batch-1', 'profile-1')).resolves.toBeUndefined()
  })

  it('rejects with 404 when there was no such enrollment to delete', async () => {
    vi.mocked(repository.deleteEnrollment).mockResolvedValue(false)

    await expect(unenroll(db, 'batch-1', 'profile-1')).rejects.toMatchObject({ statusCode: 404 })
  })
})
