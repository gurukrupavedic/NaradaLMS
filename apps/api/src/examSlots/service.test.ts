import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDbClient } from '@narada/db'

import { DbConstraint } from '../utils/dbError'
import type { AccessPolicy } from '../utils/accessPolicy'
import { approve, cancelSlot, openSlot, reject, request } from './service'
import * as repository from './repository'
import * as examRepository from '../exams/repository'
import * as trackRepository from '../tracks/repository'
import { createExam } from '../exams/service'

// Explicit factories (rather than vitest's auto-mock) so the real modules — which pull in
// `@narada/db` at import time and would trigger real env-var validation — never load.
vi.mock('./repository', () => ({
  findSlotById: vi.fn(),
  findRequestById: vi.fn(),
  findPendingRequestForStudentTrack: vi.fn(),
  findPendingRequestForSlot: vi.fn(),
  insertSlot: vi.fn(),
  updateSlotStatusGuarded: vi.fn(),
  insertRequest: vi.fn(),
  transitionRequestStatus: vi.fn(),
}))

vi.mock('../exams/repository', () => ({
  isCertifiedAcrossTrack: vi.fn(),
}))

vi.mock('../tracks/repository', () => ({
  exists: vi.fn(),
}))

vi.mock('../exams/service', () => ({
  createExam: vi.fn(),
}))

describe('openSlot', () => {
  const db = {} as SchoolDbClient
  const requireCanCreateExam = vi.fn()
  const access = { requireCanCreateExam } as unknown as AccessPolicy
  const context = { db, access }

  const data = { trackId: 'track-1', scheduledAt: new Date() }
  const created = {
    id: 'slot-1',
    trackId: 'track-1',
    scheduledAt: data.scheduledAt,
    status: 'open' as const,
    openedBy: 'admin-1',
    createdAt: new Date(),
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(trackRepository.exists).mockResolvedValue(true)
  })

  it('checks school-admin authorization before anything else', async () => {
    requireCanCreateExam.mockImplementation(() => {
      throw new Error('forbidden')
    })

    await expect(openSlot(context, data, 'admin-1')).rejects.toThrow('forbidden')

    expect(trackRepository.exists).not.toHaveBeenCalled()
    expect(repository.insertSlot).not.toHaveBeenCalled()
  })

  it('422s when the track does not exist', async () => {
    vi.mocked(trackRepository.exists).mockResolvedValue(false)

    await expect(openSlot(context, data, 'admin-1')).rejects.toMatchObject({ statusCode: 422 })

    expect(repository.insertSlot).not.toHaveBeenCalled()
  })

  it('inserts the slot with the opener stamped on it', async () => {
    vi.mocked(repository.insertSlot).mockResolvedValue(created)

    const result = await openSlot(context, data, 'admin-1')

    expect(repository.insertSlot).toHaveBeenCalledWith(db, { ...data, openedBy: 'admin-1' })
    expect(result).toBe(created)
  })
})

describe('request', () => {
  // Stubs `transaction` to actually invoke the callback with a fake `tx` and let the callback's
  // throw propagate, mimicking real Drizzle behavior (rather than just resolving statically).
  const transactionMock = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({}))
  const db = { transaction: transactionMock } as unknown as SchoolDbClient
  const context = { db }

  const slot = {
    id: 'slot-1',
    trackId: 'track-1',
    scheduledAt: new Date(),
    status: 'open' as const,
    openedBy: 'admin-1',
    createdAt: new Date(),
  }
  const requested = { ...slot, status: 'requested' as const }
  const createdRequest = {
    id: 'request-1',
    slotId: 'slot-1',
    trackId: 'track-1',
    studentId: 'student-1',
    status: 'pending' as const,
    reviewedAt: null,
    reviewedBy: null,
    examId: null,
    createdAt: new Date(),
  }

  beforeEach(() => {
    vi.resetAllMocks()
    transactionMock.mockImplementation(async callback => callback({}))
    vi.mocked(repository.findSlotById).mockResolvedValue(slot)
    vi.mocked(examRepository.isCertifiedAcrossTrack).mockResolvedValue(true)
    vi.mocked(repository.findPendingRequestForStudentTrack).mockResolvedValue(undefined)
    vi.mocked(repository.updateSlotStatusGuarded).mockResolvedValue(requested)
    vi.mocked(repository.insertRequest).mockResolvedValue(createdRequest)
  })

  it('404s when the slot does not exist, before checking eligibility', async () => {
    vi.mocked(repository.findSlotById).mockResolvedValue(undefined)

    await expect(request(context, 'slot-1', 'student-1')).rejects.toMatchObject({ statusCode: 404 })

    expect(examRepository.isCertifiedAcrossTrack).not.toHaveBeenCalled()
  })

  it('403s when the student is not L3 across every chapter of the track', async () => {
    vi.mocked(examRepository.isCertifiedAcrossTrack).mockResolvedValue(false)

    await expect(request(context, 'slot-1', 'student-1')).rejects.toMatchObject({ statusCode: 403 })

    expect(transactionMock).not.toHaveBeenCalled()
  })

  it('409s when the student already has a pending request for this track', async () => {
    vi.mocked(repository.findPendingRequestForStudentTrack).mockResolvedValue({ id: 'other-request' })

    await expect(request(context, 'slot-1', 'student-1')).rejects.toMatchObject({ statusCode: 409 })

    expect(transactionMock).not.toHaveBeenCalled()
  })

  it('claims the slot and inserts the request inside one transaction', async () => {
    const result = await request(context, 'slot-1', 'student-1')

    expect(repository.updateSlotStatusGuarded).toHaveBeenCalledWith({}, 'slot-1', 'requested', 'open')
    expect(repository.insertRequest).toHaveBeenCalledWith({}, {
      slotId: 'slot-1',
      trackId: 'track-1',
      studentId: 'student-1',
    })
    expect(result).toBe(createdRequest)
  })

  it('409s when the slot is no longer open (lost the claim race), without inserting a request', async () => {
    vi.mocked(repository.updateSlotStatusGuarded).mockResolvedValue(undefined)

    await expect(request(context, 'slot-1', 'student-1')).rejects.toMatchObject({ statusCode: 409 })

    expect(repository.insertRequest).not.toHaveBeenCalled()
  })

  it('maps a unique-constraint race on the insert to a 409', async () => {
    vi.mocked(repository.insertRequest).mockRejectedValue({
      cause: { code: '23505', constraint: DbConstraint.examSlotRequestOnePendingPerStudentTrack },
    })

    await expect(request(context, 'slot-1', 'student-1')).rejects.toMatchObject({
      statusCode: 409,
      message: 'you already have a pending request for this track',
    })
  })
})

describe('approve', () => {
  const db = {} as SchoolDbClient
  const requireCanCreateExam = vi.fn()
  const access = { requireCanCreateExam } as unknown as AccessPolicy
  const context = { db, access }

  const pendingRequest = {
    id: 'request-1',
    slotId: 'slot-1',
    trackId: 'track-1',
    studentId: 'student-1',
    status: 'pending' as const,
    reviewedAt: null,
    reviewedBy: null,
    examId: null,
    createdAt: new Date(),
  }
  const slot = {
    id: 'slot-1',
    trackId: 'track-1',
    scheduledAt: new Date('2026-10-01T10:00:00Z'),
    status: 'requested' as const,
    openedBy: 'admin-1',
    createdAt: new Date(),
  }
  const createdExam = {
    id: 'exam-1',
    trackId: 'track-1',
    studentId: 'student-1',
    batchId: 'batch-1',
    scheduledAt: slot.scheduledAt,
    status: 'scheduled' as const,
  }
  const bookedSlot = { ...slot, status: 'booked' as const }
  const approvedRequest = {
    ...pendingRequest,
    status: 'approved' as const,
    reviewedAt: new Date(),
    reviewedBy: 'admin-1',
    examId: 'exam-1',
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(repository.findRequestById).mockResolvedValue(pendingRequest)
    vi.mocked(repository.findSlotById).mockResolvedValue(slot)
    vi.mocked(createExam).mockResolvedValue(createdExam)
    vi.mocked(repository.updateSlotStatusGuarded).mockResolvedValue(bookedSlot)
    vi.mocked(repository.transitionRequestStatus).mockResolvedValue(approvedRequest)
  })

  it('checks school-admin authorization before reading anything', async () => {
    requireCanCreateExam.mockImplementation(() => {
      throw new Error('forbidden')
    })

    await expect(approve(context, 'request-1', 'admin-1')).rejects.toThrow('forbidden')

    expect(repository.findRequestById).not.toHaveBeenCalled()
  })

  it('409s a request that has already been reviewed', async () => {
    vi.mocked(repository.findRequestById).mockResolvedValue({
      ...pendingRequest,
      status: 'approved',
    })

    await expect(approve(context, 'request-1', 'admin-1')).rejects.toMatchObject({ statusCode: 409 })

    expect(createExam).not.toHaveBeenCalled()
  })

  it('books the sitting at the slot time, then books the slot, then marks the request approved', async () => {
    const result = await approve(context, 'request-1', 'admin-1')

    expect(createExam).toHaveBeenCalledWith(context, {
      trackId: 'track-1',
      studentId: 'student-1',
      scheduledAt: slot.scheduledAt,
    })
    expect(repository.updateSlotStatusGuarded).toHaveBeenCalledWith(db, 'slot-1', 'booked', 'requested')
    expect(repository.transitionRequestStatus).toHaveBeenCalledWith(
      db,
      'request-1',
      'approved',
      'admin-1',
      'exam-1',
    )
    expect(result).toBe(approvedRequest)
  })

  it('propagates a rejection from createExam without touching the slot or the request', async () => {
    vi.mocked(createExam).mockRejectedValue(new Error('no qualifying batch'))

    await expect(approve(context, 'request-1', 'admin-1')).rejects.toThrow('no qualifying batch')

    expect(repository.updateSlotStatusGuarded).not.toHaveBeenCalled()
    expect(repository.transitionRequestStatus).not.toHaveBeenCalled()
  })
})

describe('reject', () => {
  const db = {} as SchoolDbClient
  const requireCanCreateExam = vi.fn()
  const access = { requireCanCreateExam } as unknown as AccessPolicy
  const context = { db, access }

  const pendingRequest = {
    id: 'request-1',
    slotId: 'slot-1',
    trackId: 'track-1',
    studentId: 'student-1',
    status: 'pending' as const,
    reviewedAt: null,
    reviewedBy: null,
    examId: null,
    createdAt: new Date(),
  }
  const openedSlot = {
    id: 'slot-1',
    trackId: 'track-1',
    scheduledAt: new Date(),
    status: 'open' as const,
    openedBy: 'admin-1',
    createdAt: new Date(),
  }
  const rejectedRequest = {
    ...pendingRequest,
    status: 'rejected' as const,
    reviewedAt: new Date(),
    reviewedBy: 'admin-1',
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(repository.findRequestById).mockResolvedValue(pendingRequest)
    vi.mocked(repository.updateSlotStatusGuarded).mockResolvedValue(openedSlot)
    vi.mocked(repository.transitionRequestStatus).mockResolvedValue(rejectedRequest)
  })

  it('checks school-admin authorization before reading anything', async () => {
    requireCanCreateExam.mockImplementation(() => {
      throw new Error('forbidden')
    })

    await expect(reject(context, 'request-1', 'admin-1')).rejects.toThrow('forbidden')

    expect(repository.findRequestById).not.toHaveBeenCalled()
  })

  it('409s a request that has already been reviewed', async () => {
    vi.mocked(repository.findRequestById).mockResolvedValue({ ...pendingRequest, status: 'rejected' })

    await expect(reject(context, 'request-1', 'admin-1')).rejects.toMatchObject({ statusCode: 409 })

    expect(repository.updateSlotStatusGuarded).not.toHaveBeenCalled()
  })

  it('frees the slot back to open, then marks the request rejected', async () => {
    const result = await reject(context, 'request-1', 'admin-1')

    expect(repository.updateSlotStatusGuarded).toHaveBeenCalledWith(db, 'slot-1', 'open', 'requested')
    expect(repository.transitionRequestStatus).toHaveBeenCalledWith(db, 'request-1', 'rejected', 'admin-1', null)
    expect(result).toBe(rejectedRequest)
  })
})

describe('cancelSlot', () => {
  const transactionMock = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({}))
  const db = { transaction: transactionMock } as unknown as SchoolDbClient
  const requireCanCreateExam = vi.fn()
  const access = { requireCanCreateExam } as unknown as AccessPolicy
  const context = { db, access }

  const openSlotRow = {
    id: 'slot-1',
    trackId: 'track-1',
    scheduledAt: new Date(),
    status: 'open' as const,
    openedBy: 'admin-1',
    createdAt: new Date(),
  }
  const cancelledSlot = { ...openSlotRow, status: 'cancelled' as const }

  beforeEach(() => {
    vi.resetAllMocks()
    transactionMock.mockImplementation(async callback => callback({}))
    vi.mocked(repository.findSlotById).mockResolvedValue(openSlotRow)
    vi.mocked(repository.updateSlotStatusGuarded).mockResolvedValue(cancelledSlot)
    vi.mocked(repository.findPendingRequestForSlot).mockResolvedValue({ id: 'request-1' })
    vi.mocked(repository.transitionRequestStatus).mockResolvedValue({} as never)
  })

  it('checks school-admin authorization before reading anything', async () => {
    requireCanCreateExam.mockImplementation(() => {
      throw new Error('forbidden')
    })

    await expect(cancelSlot(context, 'slot-1', 'admin-1')).rejects.toThrow('forbidden')

    expect(repository.findSlotById).not.toHaveBeenCalled()
  })

  it('409s a slot that is already booked, without touching anything', async () => {
    vi.mocked(repository.findSlotById).mockResolvedValue({ ...openSlotRow, status: 'booked' })

    await expect(cancelSlot(context, 'slot-1', 'admin-1')).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('already booked'),
    })

    expect(transactionMock).not.toHaveBeenCalled()
  })

  it('409s a slot that has already been cancelled', async () => {
    vi.mocked(repository.findSlotById).mockResolvedValue({ ...openSlotRow, status: 'cancelled' })

    await expect(cancelSlot(context, 'slot-1', 'admin-1')).rejects.toMatchObject({ statusCode: 409 })

    expect(transactionMock).not.toHaveBeenCalled()
  })

  it('cancels an open slot with no pending request to reject', async () => {
    const result = await cancelSlot(context, 'slot-1', 'admin-1')

    expect(repository.updateSlotStatusGuarded).toHaveBeenCalledWith({}, 'slot-1', 'cancelled', 'open')
    expect(repository.findPendingRequestForSlot).not.toHaveBeenCalled()
    expect(repository.transitionRequestStatus).not.toHaveBeenCalled()
    expect(result).toBe(cancelledSlot)
  })

  it('cancels a requested slot and rejects the pending request holding it, in the same transaction', async () => {
    vi.mocked(repository.findSlotById).mockResolvedValue({ ...openSlotRow, status: 'requested' })

    const result = await cancelSlot(context, 'slot-1', 'admin-1')

    expect(repository.updateSlotStatusGuarded).toHaveBeenCalledWith({}, 'slot-1', 'cancelled', 'requested')
    expect(repository.findPendingRequestForSlot).toHaveBeenCalledWith({}, 'slot-1')
    expect(repository.transitionRequestStatus).toHaveBeenCalledWith({}, 'request-1', 'rejected', 'admin-1', null)
    expect(result).toBe(cancelledSlot)
  })

  it('409s when the slot changed status concurrently (lost the compare-and-set)', async () => {
    vi.mocked(repository.updateSlotStatusGuarded).mockResolvedValue(undefined)

    await expect(cancelSlot(context, 'slot-1', 'admin-1')).rejects.toMatchObject({ statusCode: 409 })

    expect(repository.transitionRequestStatus).not.toHaveBeenCalled()
  })

  it('throws internally if a requested slot somehow has no pending request holding it', async () => {
    vi.mocked(repository.findSlotById).mockResolvedValue({ ...openSlotRow, status: 'requested' })
    vi.mocked(repository.findPendingRequestForSlot).mockResolvedValue(undefined)

    await expect(cancelSlot(context, 'slot-1', 'admin-1')).rejects.toMatchObject({ statusCode: 500 })

    expect(repository.transitionRequestStatus).not.toHaveBeenCalled()
  })
})
