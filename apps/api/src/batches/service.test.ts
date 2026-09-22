import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDbClient } from '@narada/db'

import { DbConstraint } from '../utils/dbError'
import { createBatch, findByIdWithMembers, setClassSlots, updateBatch } from './service'
import * as repository from './repository'

// Explicit factory (rather than vitest's auto-mock) so the real `./repository` module — which
// pulls in `@narada/db` at import time and would trigger real env-var validation — never loads.
vi.mock('./repository', () => ({
  findTrackForBatch: vi.fn(),
  nextBatchIndex: vi.fn(),
  findClassifiers: vi.fn(),
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
const YEAR = new Date().getUTCFullYear()

const batchRow = (overrides: Partial<Awaited<ReturnType<typeof repository.insert>>> = {}) => ({
  id: 'batch-1',
  trackId: 'track-1',
  courseId: 'course-1',
  code: `VED-${YEAR}-BR-2-3`,
  status: 'upcoming' as const,
  startDate: null,
  meetingUrl: null,
  ...overrides,
})

describe('createBatch', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(repository.findTrackForBatch).mockResolvedValue({ courseId: 'course-1', order: 2 })
    vi.mocked(repository.nextBatchIndex).mockResolvedValue(3)
  })

  it("generates the code from the course slug, the current year, the classifier and the track's order, and stores the track's own course rather than one from the request", async () => {
    vi.mocked(repository.insert).mockResolvedValue(batchRow())

    await createBatch(context, { trackId: 'track-1', classifier: 'BR' }, 'ved')

    expect(repository.findTrackForBatch).toHaveBeenCalledWith(db, 'track-1')
    expect(repository.nextBatchIndex).toHaveBeenCalledWith(db, `VED-${YEAR}-BR-2`)
    expect(repository.insert).toHaveBeenCalledWith(db, {
      trackId: 'track-1',
      code: `VED-${YEAR}-BR-2-3`,
      courseId: 'course-1',
    })
  })

  it('422s for a track that does not exist, without inserting', async () => {
    vi.mocked(repository.findTrackForBatch).mockResolvedValue(undefined)

    await expect(
      createBatch(context, { trackId: 'nope', classifier: 'BR' }, 'ved'),
    ).rejects.toMatchObject({
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
      createBatch(context, { trackId: 'missing-track', classifier: 'BR' }, 'ved'),
    ).rejects.toMatchObject({
      statusCode: 422,
      message: 'unknown or invalid track',
    })
  })

  it('retries with the next index when the generated code collides, and succeeds', async () => {
    vi.mocked(repository.nextBatchIndex).mockResolvedValueOnce(3).mockResolvedValueOnce(4)
    vi.mocked(repository.insert)
      .mockRejectedValueOnce({ cause: { code: '23505', constraint: DbConstraint.batchCodeUnique } })
      .mockResolvedValueOnce(batchRow({ code: `VED-${YEAR}-BR-2-4` }))

    const result = await createBatch(context, { trackId: 'track-1', classifier: 'BR' }, 'ved')

    expect(result.code).toBe(`VED-${YEAR}-BR-2-4`)
    expect(repository.nextBatchIndex).toHaveBeenCalledTimes(2)
    expect(repository.insert).toHaveBeenCalledTimes(2)
  })

  it('gives up with a 409 after repeated code collisions rather than retrying forever', async () => {
    vi.mocked(repository.insert).mockRejectedValue({
      cause: { code: '23505', constraint: DbConstraint.batchCodeUnique },
    })

    await expect(
      createBatch(context, { trackId: 'track-1', classifier: 'BR' }, 'ved'),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('rethrows an unrecognized constraint violation unchanged', async () => {
    const original = { cause: { code: '23503', constraint: 'some_other_fk' } }
    vi.mocked(repository.insert).mockRejectedValue(original)

    await expect(
      createBatch(context, { trackId: 'track-1', classifier: 'BR' }, 'ved'),
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
