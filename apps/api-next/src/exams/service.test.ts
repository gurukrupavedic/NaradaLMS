import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDbClient } from '@narada/db'

import { DbConstraint } from '../utils/dbError'
import { createExam, recordExamResult } from './service'
import * as repository from './repository'

// Explicit factory (rather than vitest's auto-mock) so the real `./repository` module — which
// pulls in `@narada/db` at import time and would trigger real env-var validation — never loads.
vi.mock('./repository', () => ({
  findChapterTrackId: vi.fn(),
  findStudentEnrollmentForTrack: vi.fn(),
  insert: vi.fn(),
  findById: vi.fn(),
  insertEvaluation: vi.fn(),
  complete: vi.fn(),
}))

describe('createExam', () => {
  const db = {} as SchoolDbClient
  const context = { db }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(repository.findChapterTrackId).mockResolvedValue({ trackId: 'track-1' })
    vi.mocked(repository.findStudentEnrollmentForTrack).mockResolvedValue([{ batchId: 'batch-1' }])
  })

  it.each([DbConstraint.examStudentIdFk, DbConstraint.examChapterIdFk])(
    'maps %s to a 422 with the student/chapter message',
    async constraint => {
      vi.mocked(repository.insert).mockRejectedValue({
        cause: { code: '23503', constraint },
      })

      await expect(
        createExam(context, {
          studentId: 'student-1',
          chapterId: 'chapter-1',
          scheduledAt: new Date(),
        }),
      ).rejects.toMatchObject({
        statusCode: 422,
        message: 'student or chapter no longer exists',
      })
    },
  )
})

describe('recordExamResult', () => {
  // Stubs `transaction` to actually invoke the callback with a fake `tx` and let the callback's
  // throw propagate, mimicking real Drizzle behavior (rather than just resolving statically) —
  // this is what proves the mapped error propagates out of `context.db.transaction(...)`.
  const transactionMock = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({}),
  )
  const db = { transaction: transactionMock } as unknown as SchoolDbClient
  const context = { db }

  const existingExam = {
    id: 'exam-1',
    chapterId: 'chapter-1',
    studentId: 'student-1',
    scheduledAt: new Date(),
    status: 'scheduled' as const,
    evaluationId: null,
    performedAt: null,
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(repository.findById).mockResolvedValue(existingExam)
    transactionMock.mockImplementation(async callback => callback({}))
  })

  it.each([
    DbConstraint.evaluationStudentIdFk,
    DbConstraint.evaluationChapterIdFk,
    DbConstraint.evaluationEvaluatorIdFk,
  ])('maps %s to a 422 with the student/chapter/evaluator message', async constraint => {
    vi.mocked(repository.insertEvaluation).mockRejectedValue({
      cause: { code: '23503', constraint },
    })

    await expect(
      recordExamResult(context, 'exam-1', 'evaluator-1', { level: 'level1' }),
    ).rejects.toMatchObject({
      statusCode: 422,
      message: 'student, chapter, or evaluator no longer exists',
    })

    expect(transactionMock).toHaveBeenCalled()
  })
})
