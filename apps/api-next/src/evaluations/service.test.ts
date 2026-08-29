import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDbClient } from '@narada/db'

import { createEvaluation, findByBatch, findByStudent } from './service'
import * as repository from './repository'
import * as enrollmentService from '../enrollment/service'
import * as batchRepository from '../batches/repository'

// Explicit factory (rather than vitest's auto-mock) so the real `./repository` module — which
// pulls in `@narada/db` at import time and would trigger real env-var validation — never loads.
vi.mock('./repository', () => ({
  findChapterTrackId: vi.fn(),
  findForBatch: vi.fn(),
  findForStudentInBatch: vi.fn(),
  insert: vi.fn(),
}))

vi.mock('../enrollment/service', () => ({
  assertStudentEnrolledInBatch: vi.fn(),
}))

vi.mock('../batches/repository', () => ({
  findById: vi.fn(),
}))

const db = {} as SchoolDbClient
const context = { db }

beforeEach(() => {
  vi.resetAllMocks()
})

describe('findByBatch / findByStudent', () => {
  it('findByBatch resolves the batch track and delegates to repository.findForBatch', async () => {
    vi.mocked(batchRepository.findById).mockResolvedValue({ trackId: 'track-1' } as never)
    vi.mocked(repository.findForBatch).mockResolvedValue({ items: [], nextCursor: null })

    await findByBatch(context, 'batch-1', { limit: 20 })

    expect(repository.findForBatch).toHaveBeenCalledWith(db, 'batch-1', 'track-1', { limit: 20 })
  })

  it('findByBatch throws 404 when the batch does not exist', async () => {
    vi.mocked(batchRepository.findById).mockResolvedValue(undefined)

    await expect(findByBatch(context, 'batch-1', { limit: 20 })).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(repository.findForBatch).not.toHaveBeenCalled()
  })

  it('findByStudent resolves the batch track and delegates to repository.findForStudentInBatch', async () => {
    vi.mocked(batchRepository.findById).mockResolvedValue({ trackId: 'track-1' } as never)
    vi.mocked(repository.findForStudentInBatch).mockResolvedValue({ items: [], nextCursor: null })

    await findByStudent(context, 'batch-1', 'student-1', { limit: 20 })

    expect(repository.findForStudentInBatch).toHaveBeenCalledWith(
      db,
      'batch-1',
      'track-1',
      'student-1',
      { limit: 20 },
    )
  })

  it('findByStudent throws 404 when the batch does not exist', async () => {
    vi.mocked(batchRepository.findById).mockResolvedValue(undefined)

    await expect(
      findByStudent(context, 'batch-1', 'student-1', { limit: 20 }),
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(repository.findForStudentInBatch).not.toHaveBeenCalled()
  })
})

describe('createEvaluation', () => {
  const data = { studentId: 'student-1', chapterId: 'chapter-1', level: 'level1' as const }

  beforeEach(() => {
    vi.mocked(enrollmentService.assertStudentEnrolledInBatch).mockResolvedValue(undefined)
    vi.mocked(repository.findChapterTrackId).mockResolvedValue({ trackId: 'track-1' })
    vi.mocked(batchRepository.findById).mockResolvedValue({ trackId: 'track-1' } as never)
    vi.mocked(repository.insert).mockResolvedValue({
      id: 'evaluation-1',
      studentId: 'student-1',
      chapterId: 'chapter-1',
      batchId: 'batch-1',
      level: 'level1',
      notes: null,
      evaluatorId: 'evaluator-1',
      evaluatedAt: new Date(),
    })
  })

  it('validates enrollment before anything else, then chapter, then batch/track match, then inserts', async () => {
    await createEvaluation(context, 'batch-1', 'evaluator-1', data)

    expect(enrollmentService.assertStudentEnrolledInBatch).toHaveBeenCalledWith(
      db,
      'student-1',
      'batch-1',
    )
    expect(repository.insert).toHaveBeenCalledWith(db, {
      ...data,
      batchId: 'batch-1',
      evaluatorId: 'evaluator-1',
    })
  })

  it('propagates the 422 from assertStudentEnrolledInBatch without looking up the chapter', async () => {
    vi.mocked(enrollmentService.assertStudentEnrolledInBatch).mockRejectedValue(
      Object.assign(new Error('student is not enrolled in this batch'), { statusCode: 422 }),
    )

    await expect(createEvaluation(context, 'batch-1', 'evaluator-1', data)).rejects.toMatchObject({
      statusCode: 422,
    })
    expect(repository.findChapterTrackId).not.toHaveBeenCalled()
    expect(repository.insert).not.toHaveBeenCalled()
  })

  it('throws 404 when the chapter does not exist', async () => {
    vi.mocked(repository.findChapterTrackId).mockResolvedValue(undefined)

    await expect(createEvaluation(context, 'batch-1', 'evaluator-1', data)).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(repository.insert).not.toHaveBeenCalled()
  })

  it('throws 404 when the batch does not exist', async () => {
    vi.mocked(batchRepository.findById).mockResolvedValue(undefined)

    await expect(createEvaluation(context, 'batch-1', 'evaluator-1', data)).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(repository.insert).not.toHaveBeenCalled()
  })

  it('throws 422 when the chapter does not belong to the batch track', async () => {
    vi.mocked(repository.findChapterTrackId).mockResolvedValue({ trackId: 'track-1' })
    vi.mocked(batchRepository.findById).mockResolvedValue({ trackId: 'track-2' } as never)

    await expect(createEvaluation(context, 'batch-1', 'evaluator-1', data)).rejects.toMatchObject({
      statusCode: 422,
      message: 'chapter does not belong to this batch track',
    })
    expect(repository.insert).not.toHaveBeenCalled()
  })
})
