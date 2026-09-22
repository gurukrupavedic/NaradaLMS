import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDbClient } from '@narada/db'

import { DbConstraint } from '../utils/dbError'
import { createBatch, findByIdWithMembers, setClassSlots, updateBatch } from './service'
import * as repository from './repository'

// Explicit factory (rather than vitest's auto-mock) so the real `./repository` module — which
// pulls in `@narada/db` at import time and would trigger real env-var validation — never loads.
vi.mock('./repository', () => ({
  findTrackCourseId: vi.fn(),
  endActiveStudentSeats: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  findById: vi.fn(),
  findByIdWithMembers: vi.fn(),
  deleteClassSlots: vi.fn(),
  insertClassSlots: vi.fn(),
}))

const db = {} as SchoolDbClient
const context = { db }

describe('createBatch', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(repository.findTrackCourseId).mockResolvedValue('course-1')
  })

  it("stores the track's course on the new batch rather than taking one from the request", async () => {
    vi.mocked(repository.insert).mockResolvedValue({
      id: 'batch-1',
      trackId: 'track-1',
      courseId: 'course-1',
      code: 'B1',
      status: 'upcoming',
      startDate: null,
      meetingUrl: null,
    })

    await createBatch(context, { trackId: 'track-1', code: 'B1' })

    expect(repository.findTrackCourseId).toHaveBeenCalledWith(db, 'track-1')
    expect(repository.insert).toHaveBeenCalledWith(db, {
      trackId: 'track-1',
      code: 'B1',
      courseId: 'course-1',
    })
  })

  it('422s for a track that does not exist, without inserting', async () => {
    vi.mocked(repository.findTrackCourseId).mockResolvedValue(undefined)

    await expect(createBatch(context, { trackId: 'nope', code: 'B1' })).rejects.toMatchObject({
      statusCode: 422,
      message: 'unknown or invalid track',
    })
    expect(repository.insert).not.toHaveBeenCalled()
  })

  it('maps batch_trackId_track_id_fk to a 422 with a track-specific message', async () => {
    vi.mocked(repository.insert).mockRejectedValue({
      cause: { code: '23503', constraint: DbConstraint.batchTrackIdFk },
    })

    await expect(
      createBatch(context, { trackId: 'missing-track', code: 'BATCH-1' }),
    ).rejects.toMatchObject({
      statusCode: 422,
      message: 'unknown or invalid track',
    })
  })

  it('maps batch_code_unique to a 409 with a duplicate-code message', async () => {
    vi.mocked(repository.insert).mockRejectedValue({
      cause: { code: '23505', constraint: DbConstraint.batchCodeUnique },
    })

    await expect(
      createBatch(context, { trackId: 'track-1', code: 'DUP' }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'a batch with this code already exists',
    })
  })

  it('rethrows an unrecognized constraint violation unchanged', async () => {
    const original = { cause: { code: '23503', constraint: 'some_other_fk' } }
    vi.mocked(repository.insert).mockRejectedValue(original)

    await expect(
      createBatch(context, { trackId: 'track-1', code: 'X' }),
    ).rejects.toBe(original)
  })
})

describe('updateBatch', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('maps batch_code_unique to a 409 with a duplicate-code message', async () => {
    vi.mocked(repository.update).mockRejectedValue({
      cause: { code: '23505', constraint: DbConstraint.batchCodeUnique },
    })

    await expect(updateBatch(context, 'batch-1', { code: 'DUP' })).rejects.toMatchObject({
      statusCode: 409,
      message: 'a batch with this code already exists',
    })
  })

  describe('marking a batch completed', () => {
    const tx = {}
    const transactionMock = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(tx))
    const txContext = { db: { transaction: transactionMock } as unknown as SchoolDbClient }
    const completed = {
      id: 'batch-1',
      trackId: 'track-1',
      courseId: 'course-1',
      code: 'B1',
      status: 'completed' as const,
      startDate: null,
      meetingUrl: null,
    }

    beforeEach(() => {
      transactionMock.mockImplementation(async callback => callback(tx))
    })

    it("ends the students' active seats in the same transaction, after the batch itself is updated", async () => {
      vi.mocked(repository.update).mockResolvedValue(completed)

      await updateBatch(txContext, 'batch-1', { status: 'completed' })

      expect(transactionMock).toHaveBeenCalledTimes(1)
      expect(repository.update).toHaveBeenCalledWith(tx, 'batch-1', { status: 'completed' })
      expect(repository.endActiveStudentSeats).toHaveBeenCalledWith(tx, 'batch-1')
      expect(vi.mocked(repository.update).mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(repository.endActiveStudentSeats).mock.invocationCallOrder[0]!,
      )
    })

    it('404s for a batch that does not exist, without touching any seats', async () => {
      vi.mocked(repository.update).mockResolvedValue(undefined)

      await expect(updateBatch(txContext, 'batch-1', { status: 'completed' })).rejects.toMatchObject({
        statusCode: 404,
      })
      expect(repository.endActiveStudentSeats).not.toHaveBeenCalled()
    })

    it.each(['upcoming', 'active'] as const)('leaves seats alone when the status becomes %s', async status => {
      vi.mocked(repository.update).mockResolvedValue({ ...completed, status })

      await updateBatch(context, 'batch-1', { status })

      expect(repository.endActiveStudentSeats).not.toHaveBeenCalled()
    })
  })
})

describe('findByIdWithMembers', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns the batch with its roster', async () => {
    const detail = {
      id: 'batch-1',
      trackId: 'track-1',
      courseId: 'course-1',
      code: 'B1',
      status: 'active' as const,
      startDate: null,
      meetingUrl: null,
      members: [
        {
          profileId: 'profile-1',
          name: 'Student One',
          phone: null,
          email: null,
          city: null,
          role: 'student' as const,
          joinedAt: new Date(),
          status: 'active' as const,
        },
      ],
      classSlots: [],
    }
    vi.mocked(repository.findByIdWithMembers).mockResolvedValue(detail)

    await expect(findByIdWithMembers(context, 'batch-1')).resolves.toEqual(detail)
  })

  it('throws 404 when the batch does not exist', async () => {
    vi.mocked(repository.findByIdWithMembers).mockResolvedValue(undefined)

    await expect(findByIdWithMembers(context, 'batch-1')).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})

describe('setClassSlots', () => {
  const tx = {}
  // Stubs `transaction` to actually invoke the callback with a fake `tx`, mimicking real Drizzle
  // behavior — this is what proves `deleteClassSlots`/`insertClassSlots` are called with the
  // transaction-scoped client, not the outer `context.db`.
  const transactionMock = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(tx))
  const txDb = { transaction: transactionMock } as unknown as SchoolDbClient
  const txContext = { db: txDb }

  beforeEach(() => {
    vi.resetAllMocks()
    transactionMock.mockImplementation(async callback => callback(tx))
  })

  it('throws 404 without touching the schedule when the batch does not exist', async () => {
    vi.mocked(repository.findById).mockResolvedValue(undefined)

    await expect(setClassSlots(context, 'batch-1', { slots: [] })).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(repository.deleteClassSlots).not.toHaveBeenCalled()
    expect(repository.insertClassSlots).not.toHaveBeenCalled()
  })

  it('replaces the schedule inside one transaction: delete then insert, in that order', async () => {
    vi.mocked(repository.findById).mockResolvedValue({
      id: 'batch-1',
      trackId: 'track-1',
      courseId: 'course-1',
      code: 'B1',
      status: 'active',
      startDate: null,
      meetingUrl: null,
    })
    const newSlots = [{ dayOfWeek: 1, time: '09:00', durationMinutes: 60 }]
    vi.mocked(repository.insertClassSlots).mockResolvedValue(newSlots)

    const result = await setClassSlots(txContext, 'batch-1', { slots: newSlots })

    expect(result).toEqual(newSlots)
    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(repository.deleteClassSlots).toHaveBeenCalledWith(tx, 'batch-1')
    expect(repository.insertClassSlots).toHaveBeenCalledWith(tx, 'batch-1', newSlots)

    const deleteOrder = vi.mocked(repository.deleteClassSlots).mock.invocationCallOrder[0]
    const insertOrder = vi.mocked(repository.insertClassSlots).mock.invocationCallOrder[0]
    expect(deleteOrder).toBeLessThan(insertOrder!)
  })

  it('replacing with an empty slot list clears the schedule and returns []', async () => {
    vi.mocked(repository.findById).mockResolvedValue({
      id: 'batch-1',
      trackId: 'track-1',
      courseId: 'course-1',
      code: 'B1',
      status: 'active',
      startDate: null,
      meetingUrl: null,
    })
    vi.mocked(repository.insertClassSlots).mockResolvedValue([])

    await expect(setClassSlots(txContext, 'batch-1', { slots: [] })).resolves.toEqual([])
    expect(repository.deleteClassSlots).toHaveBeenCalledWith(tx, 'batch-1')
  })
})
