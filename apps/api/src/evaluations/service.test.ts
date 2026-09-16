import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDbClient } from '@narada/db'

import { createEvaluations, findByBatch, findByStudent } from './service'
import * as repository from './repository'
import * as enrollmentService from '../enrollment/service'
import * as batchRepository from '../batches/repository'

// Explicit factory (rather than vitest's auto-mock) so the real `./repository` module — which
// pulls in `@narada/db` at import time and would trigger real env-var validation — never loads.
vi.mock('./repository', () => ({
  findChapterTrackId: vi.fn(),
  findForBatch: vi.fn(),
  findForStudentInBatch: vi.fn(),
  findForChaptersAndStudents: vi.fn(),
  insertMany: vi.fn(),
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

describe('createEvaluations', () => {
  const item = { studentId: 'student-1', chapterId: 'chapter-1', level: 'level1' as const }

  function evaluationRow(overrides: {
    studentId: string
    chapterId: string
    level: 'absent' | 'notStarted' | 'practicing' | 'level1' | 'level2' | 'level3' | 'level4'
    evaluatedAt?: Date
  }) {
    return {
      id: `evaluation-${overrides.studentId}-${overrides.chapterId}-${overrides.level}`,
      batchId: 'batch-1',
      notes: null,
      evaluatorId: 'evaluator-1',
      evaluatedAt: new Date('2024-01-01T00:00:00Z'),
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.mocked(enrollmentService.assertStudentEnrolledInBatch).mockResolvedValue(undefined)
    vi.mocked(repository.findChapterTrackId).mockResolvedValue({ trackId: 'track-1' })
    vi.mocked(batchRepository.findById).mockResolvedValue({ trackId: 'track-1' } as never)
    vi.mocked(repository.findForChaptersAndStudents).mockResolvedValue([])
    vi.mocked(repository.insertMany).mockImplementation(async (_db, rows) =>
      rows.map(row => evaluationRow({ ...row, level: row.level as never })),
    )
  })

  it('validates enrollment before anything else, then chapter, then batch/track match, then inserts', async () => {
    await createEvaluations(context, 'batch-1', 'evaluator-1', [item])

    expect(enrollmentService.assertStudentEnrolledInBatch).toHaveBeenCalledWith(
      db,
      'student-1',
      'batch-1',
    )
    expect(repository.insertMany).toHaveBeenCalledWith(db, [
      { ...item, batchId: 'batch-1', evaluatorId: 'evaluator-1' },
    ])
  })

  it('propagates the 422 from assertStudentEnrolledInBatch without looking up the chapter', async () => {
    vi.mocked(enrollmentService.assertStudentEnrolledInBatch).mockRejectedValue(
      Object.assign(new Error('student is not enrolled in this batch'), { statusCode: 422 }),
    )

    await expect(
      createEvaluations(context, 'batch-1', 'evaluator-1', [item]),
    ).rejects.toMatchObject({ statusCode: 422 })
    expect(repository.findChapterTrackId).not.toHaveBeenCalled()
    expect(repository.insertMany).not.toHaveBeenCalled()
  })

  it('throws 404 when a chapter does not exist', async () => {
    vi.mocked(repository.findChapterTrackId).mockResolvedValue(undefined)

    await expect(
      createEvaluations(context, 'batch-1', 'evaluator-1', [item]),
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(repository.insertMany).not.toHaveBeenCalled()
  })

  it('throws 404 when the batch does not exist', async () => {
    vi.mocked(batchRepository.findById).mockResolvedValue(undefined)

    await expect(
      createEvaluations(context, 'batch-1', 'evaluator-1', [item]),
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(repository.insertMany).not.toHaveBeenCalled()
    expect(enrollmentService.assertStudentEnrolledInBatch).not.toHaveBeenCalled()
  })

  it('throws 422 when a chapter does not belong to the batch track', async () => {
    vi.mocked(repository.findChapterTrackId).mockResolvedValue({ trackId: 'track-1' })
    vi.mocked(batchRepository.findById).mockResolvedValue({ trackId: 'track-2' } as never)

    await expect(
      createEvaluations(context, 'batch-1', 'evaluator-1', [item]),
    ).rejects.toMatchObject({
      statusCode: 422,
      message: 'chapter does not belong to this batch track',
    })
    expect(repository.insertMany).not.toHaveBeenCalled()
  })

  it('validates every item before inserting any of them', async () => {
    vi.mocked(repository.findChapterTrackId).mockImplementation(async (_db, chapterId) =>
      chapterId === 'chapter-bad' ? undefined : { trackId: 'track-1' },
    )

    await expect(
      createEvaluations(context, 'batch-1', 'evaluator-1', [
        item,
        { studentId: 'student-1', chapterId: 'chapter-bad', level: 'level1' },
      ]),
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(repository.insertMany).not.toHaveBeenCalled()
  })

  it('inserts every item in one call when none is already certified', async () => {
    const items = [
      { studentId: 'student-1', chapterId: 'chapter-1', level: 'level3' as const },
      { studentId: 'student-1', chapterId: 'chapter-2', level: 'level3' as const },
    ]

    const result = await createEvaluations(context, 'batch-1', 'evaluator-1', items)

    expect(repository.insertMany).toHaveBeenCalledWith(
      db,
      items.map(i => ({ ...i, batchId: 'batch-1', evaluatorId: 'evaluator-1' })),
    )
    expect(result).toHaveLength(2)
  })

  // A chapter already at L4 must never get a fresh row over it — evaluations are append-only
  // history and the *latest* one wins on the grid regardless of level (see createEvaluations's own
  // doc comment), so writing over an exam-certified L4 would silently downgrade it.
  it('skips a chapter already certified at L4, inserting only the rest', async () => {
    vi.mocked(repository.findForChaptersAndStudents).mockResolvedValue([
      evaluationRow({ studentId: 'student-1', chapterId: 'chapter-2', level: 'level4' }),
    ])

    const items = [
      { studentId: 'student-1', chapterId: 'chapter-1', level: 'level3' as const },
      { studentId: 'student-1', chapterId: 'chapter-2', level: 'level3' as const },
    ]

    await createEvaluations(context, 'batch-1', 'evaluator-1', items)

    expect(repository.insertMany).toHaveBeenCalledWith(db, [
      { ...items[0]!, batchId: 'batch-1', evaluatorId: 'evaluator-1' },
    ])
  })

  it('judges each chapter by its most recent evaluation, not an earlier one', async () => {
    vi.mocked(repository.findForChaptersAndStudents).mockResolvedValue([
      evaluationRow({
        studentId: 'student-1',
        chapterId: 'chapter-1',
        level: 'level4',
        evaluatedAt: new Date('2024-01-01T00:00:00Z'),
      }),
      evaluationRow({
        studentId: 'student-1',
        chapterId: 'chapter-1',
        level: 'level1',
        evaluatedAt: new Date('2024-02-01T00:00:00Z'),
      }),
    ])

    const result = await createEvaluations(context, 'batch-1', 'evaluator-1', [item])

    expect(repository.insertMany).toHaveBeenCalledWith(db, [
      { ...item, batchId: 'batch-1', evaluatorId: 'evaluator-1' },
    ])
    expect(result).toHaveLength(1)
  })

  // A bulk request (promote) where every item lands on an already-certified chapter is routine —
  // the caller just gets fewer rows back. A *single*-item request landing there is exceptional
  // (the roster grid disables editing an L4 cell, so this means a race), and the empty result is
  // what lets the web's own `createEvaluation` wrapper turn it into a real error for the dialog.
  it('throws a 409 when every item is filtered out as already certified', async () => {
    vi.mocked(repository.findForChaptersAndStudents).mockResolvedValue([
      evaluationRow({ studentId: 'student-1', chapterId: 'chapter-1', level: 'level4' }),
    ])

    await expect(
      createEvaluations(context, 'batch-1', 'evaluator-1', [item]),
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(repository.insertMany).toHaveBeenCalledWith(db, [])
  })
})
