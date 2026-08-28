import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDbClient } from '@narada/db'

import { DbConstraint } from '../utils/dbError'
import { createExam, recordExamResult } from './service'
import * as repository from './repository'
import * as enrollmentService from '../enrollment/service'

// Explicit factory (rather than vitest's auto-mock) so the real `./repository` module — which
// pulls in `@narada/db` at import time and would trigger real env-var validation — never loads.
vi.mock('./repository', () => ({
  findChapterTrackId: vi.fn(),
  insert: vi.fn(),
  findById: vi.fn(),
  insertEvaluation: vi.fn(),
  complete: vi.fn(),
}))

// The enrollment-ambiguity check itself is owned and tested by the enrollment domain
// (`enrollment/service.test.ts`) — these tests only prove createExam calls it correctly and
// propagates its result/errors, not the ambiguity logic itself.
vi.mock('../enrollment/service', () => ({
  resolveQualifyingBatch: vi.fn(),
}))

describe('createExam', () => {
  const db = {} as SchoolDbClient
  const context = { db }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(repository.findChapterTrackId).mockResolvedValue({ trackId: 'track-1' })
    vi.mocked(enrollmentService.resolveQualifyingBatch).mockResolvedValue('batch-1')
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

  it('succeeds and stores the resolved batchId on the new exam', async () => {
    const scheduledAt = new Date()
    vi.mocked(repository.insert).mockResolvedValue({
      id: 'exam-1',
      chapterId: 'chapter-1',
      studentId: 'student-1',
      batchId: 'batch-1',
      scheduledAt,
      status: 'scheduled',
      evaluationId: null,
      performedAt: null,
    })

    await createExam(context, {
      studentId: 'student-1',
      chapterId: 'chapter-1',
      scheduledAt,
    })

    expect(repository.insert).toHaveBeenCalledWith(db, {
      studentId: 'student-1',
      chapterId: 'chapter-1',
      scheduledAt,
      batchId: 'batch-1',
    })
  })

  it('calls resolveQualifyingBatch with the chapter-resolved trackId and propagates its result', async () => {
    vi.mocked(repository.insert).mockResolvedValue({
      id: 'exam-1',
      chapterId: 'chapter-1',
      studentId: 'student-1',
      batchId: 'batch-1',
      scheduledAt: new Date(),
      status: 'scheduled',
      evaluationId: null,
      performedAt: null,
    })

    await createExam(context, {
      studentId: 'student-1',
      chapterId: 'chapter-1',
      scheduledAt: new Date(),
    })

    expect(enrollmentService.resolveQualifyingBatch).toHaveBeenCalledWith(
      db,
      'student-1',
      'track-1',
    )
  })

  it('propagates a rejection from resolveQualifyingBatch (e.g. ambiguous or no qualifying batch) without inserting', async () => {
    vi.mocked(enrollmentService.resolveQualifyingBatch).mockRejectedValue(
      new Error("student is enrolled in multiple batches for this chapter's track"),
    )

    await expect(
      createExam(context, {
        studentId: 'student-1',
        chapterId: 'chapter-1',
        scheduledAt: new Date(),
      }),
    ).rejects.toThrow("student is enrolled in multiple batches for this chapter's track")

    expect(repository.insert).not.toHaveBeenCalled()
  })
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
    batchId: 'batch-1',
    scheduledAt: new Date(),
    status: 'scheduled' as const,
    evaluationId: null,
    performedAt: null,
  }

  const evaluationRow = {
    id: 'evaluation-1',
    studentId: 'student-1',
    chapterId: 'chapter-1',
    batchId: 'batch-1',
    level: 'level1' as const,
    notes: null,
    evaluatorId: 'evaluator-1',
    evaluatedAt: new Date(),
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(repository.findById).mockResolvedValue(existingExam)
    vi.mocked(repository.insertEvaluation).mockResolvedValue(evaluationRow)
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

  it("copies the exam's batchId onto the inserted evaluation", async () => {
    vi.mocked(repository.complete).mockResolvedValue({
      ...existingExam,
      status: 'completed',
      evaluationId: 'evaluation-1',
      performedAt: new Date(),
    })

    await recordExamResult(context, 'exam-1', 'evaluator-1', { level: 'level1' })

    expect(repository.insertEvaluation).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ batchId: 'batch-1' }),
    )
  })

  it("calls repository.complete with existing.status as the expectedStatus argument", async () => {
    vi.mocked(repository.complete).mockResolvedValue({
      ...existingExam,
      status: 'completed',
      evaluationId: 'evaluation-1',
      performedAt: new Date(),
    })

    await recordExamResult(context, 'exam-1', 'evaluator-1', { level: 'level1' })

    expect(repository.complete).toHaveBeenCalledWith(
      {},
      'exam-1',
      'evaluation-1',
      expect.any(Date),
      'scheduled',
    )
  })

  it('throws a 409 "already recorded" conflict when the follow-up read shows evaluationId set', async () => {
    vi.mocked(repository.complete).mockResolvedValue(undefined)
    vi.mocked(repository.findById)
      .mockResolvedValueOnce(existingExam)
      .mockResolvedValueOnce({
        ...existingExam,
        status: 'completed',
        evaluationId: 'evaluation-other',
        performedAt: new Date(),
      })

    await expect(
      recordExamResult(context, 'exam-1', 'evaluator-1', { level: 'level1' }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'a result was already recorded for this exam',
    })

    expect(transactionMock).toHaveBeenCalled()
    expect(repository.findById).toHaveBeenNthCalledWith(2, {}, 'exam-1')
  })

  it('throws a 409 "status changed concurrently" conflict when the follow-up read shows evaluationId still null', async () => {
    vi.mocked(repository.complete).mockResolvedValue(undefined)
    vi.mocked(repository.findById)
      .mockResolvedValueOnce(existingExam)
      .mockResolvedValueOnce({ ...existingExam, status: 'cancelled' as const, evaluationId: null })

    await expect(
      recordExamResult(context, 'exam-1', 'evaluator-1', { level: 'level1' }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'exam status changed concurrently',
    })

    expect(transactionMock).toHaveBeenCalled()
    expect(repository.findById).toHaveBeenNthCalledWith(2, {}, 'exam-1')
  })

  it('throws 404 when the follow-up read finds no row', async () => {
    vi.mocked(repository.complete).mockResolvedValue(undefined)
    vi.mocked(repository.findById)
      .mockResolvedValueOnce(existingExam)
      .mockResolvedValueOnce(undefined)

    await expect(
      recordExamResult(context, 'exam-1', 'evaluator-1', { level: 'level1' }),
    ).rejects.toMatchObject({
      statusCode: 404,
    })

    expect(transactionMock).toHaveBeenCalled()
    expect(repository.findById).toHaveBeenNthCalledWith(2, {}, 'exam-1')
  })
})
