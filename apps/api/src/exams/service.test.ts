import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDbClient } from '@narada/db'

import { DbConstraint } from '../utils/dbError'
import type { AccessPolicy } from '../utils/accessPolicy'
import { createExam, findByIdWithDetail, recordExamResult } from './service'
import * as repository from './repository'
import * as enrollmentService from '../enrollment/service'
import * as trackRepository from '../tracks/repository'

// Explicit factory (rather than vitest's auto-mock) so the real `./repository` module — which
// pulls in `@narada/db` at import time and would trigger real env-var validation — never loads.
vi.mock('./repository', () => ({
  findStudentYearOfBirth: vi.fn(),
  findGradableChapterIds: vi.fn(),
  insert: vi.fn(),
  findById: vi.fn(),
  findByIdWithDetail: vi.fn(),
  insertResult: vi.fn(),
  insertEvaluations: vi.fn(),
  complete: vi.fn(),
}))

// The enrollment check itself is owned and tested by the enrollment domain
// (`enrollment/service.test.ts`) — these tests only prove createExam calls it correctly and
// propagates its errors, not the check itself.
vi.mock('../tracks/repository', () => ({
  exists: vi.fn(),
}))

vi.mock('../enrollment/service', () => ({
  assertEnrolledInTrack: vi.fn(),
}))

describe('createExam', () => {
  const db = {} as SchoolDbClient
  const requireCanCreateExam = vi.fn()
  const access = { requireCanCreateExam } as unknown as AccessPolicy
  const context = { db, access }

  const data = { studentId: 'student-1', trackId: 'track-1', scheduledAt: new Date() }
  const created = {
    id: 'exam-1',
    trackId: 'track-1',
    studentId: 'student-1',
    scheduledAt: new Date(),
    status: 'scheduled' as const,
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(trackRepository.exists).mockResolvedValue(true)
    vi.mocked(enrollmentService.assertEnrolledInTrack).mockResolvedValue(undefined)
  })

  it.each([DbConstraint.examStudentIdFk, DbConstraint.examTrackIdFk])(
    'maps %s to a 422 with the student/track message',
    async constraint => {
      vi.mocked(repository.insert).mockRejectedValue({
        cause: { code: '23503', constraint },
      })

      await expect(createExam(context, data)).rejects.toMatchObject({
        statusCode: 422,
        message: 'student or track no longer exists',
      })
    },
  )

  it('succeeds and inserts the exam as given', async () => {
    vi.mocked(repository.insert).mockResolvedValue(created)

    await createExam(context, data)

    expect(repository.insert).toHaveBeenCalledWith(db, data)
  })

  it("authorizes before checking the student's enrollment", async () => {
    vi.mocked(repository.insert).mockResolvedValue(created)

    await createExam(context, data)

    expect(requireCanCreateExam).toHaveBeenCalledWith()
    expect(requireCanCreateExam.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(enrollmentService.assertEnrolledInTrack).mock.invocationCallOrder[0]!,
    )
  })

  it('propagates a rejection from access.requireCanCreateExam without checking enrollment or inserting', async () => {
    requireCanCreateExam.mockImplementation(() => {
      throw new Error('forbidden')
    })

    await expect(createExam(context, data)).rejects.toThrow('forbidden')

    expect(enrollmentService.assertEnrolledInTrack).not.toHaveBeenCalled()
    expect(repository.insert).not.toHaveBeenCalled()
  })

  it('rejects a track that does not exist with a 422, before checking enrollment', async () => {
    vi.mocked(trackRepository.exists).mockResolvedValue(false)

    await expect(createExam(context, data)).rejects.toMatchObject({
      statusCode: 422,
      message: 'track not found',
    })

    expect(enrollmentService.assertEnrolledInTrack).not.toHaveBeenCalled()
    expect(repository.insert).not.toHaveBeenCalled()
  })

  it("calls assertEnrolledInTrack with the exam's own student and trackId", async () => {
    vi.mocked(repository.insert).mockResolvedValue(created)

    await createExam(context, data)

    expect(enrollmentService.assertEnrolledInTrack).toHaveBeenCalledWith(
      db,
      'student-1',
      'track-1',
    )
  })

  it('propagates a rejection from assertEnrolledInTrack (no enrollment on the track) without inserting', async () => {
    vi.mocked(enrollmentService.assertEnrolledInTrack).mockRejectedValue(
      new Error('student is not enrolled in a batch for this track'),
    )

    await expect(createExam(context, data)).rejects.toThrow(
      'student is not enrolled in a batch for this track',
    )

    expect(repository.insert).not.toHaveBeenCalled()
  })
})

describe('recordExamResult', () => {
  // Stubs `transaction` to actually invoke the callback with a fake `tx` and let the callback's
  // throw propagate, mimicking real Drizzle behavior (rather than just resolving statically) —
  // this is what proves the mapped error propagates out of `context.db.transaction(...)`.
  const transactionMock = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({}))
  const db = { transaction: transactionMock } as unknown as SchoolDbClient
  const context = { db }

  const existingExam = {
    id: 'exam-1',
    trackId: 'track-1',
    studentId: 'student-1',
    // June 2026 — the year the children's bonus is measured against.
    scheduledAt: new Date('2026-06-15T10:00:00Z'),
    status: 'scheduled' as const,
  }
  const completedExam = { ...existingExam, status: 'completed' as const }

  // 98 on the sheet — Prathama Sreni (L4) for an adult with no bonus.
  const marks = {
    aksharaShuddhi: 45,
    swaraShuddhi: 27,
    niyantranaAnargalata: 18,
    shraavyata: 4,
    pratishakyaGrammar: 4,
  }

  const detail = {
    ...existingExam,
    status: 'completed' as const,
    track: { id: 'track-1', name: 'Track 1' },
    result: null,
    student: { id: 'student-1', name: 'Student One' },
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(repository.findById).mockResolvedValue(existingExam)
    vi.mocked(repository.findStudentYearOfBirth).mockResolvedValue(1990)
    vi.mocked(repository.complete).mockResolvedValue(completedExam)
    vi.mocked(repository.insertResult).mockResolvedValue({} as never)
    vi.mocked(repository.findGradableChapterIds).mockResolvedValue(['chapter-1', 'chapter-2'])
    vi.mocked(repository.findByIdWithDetail).mockResolvedValue(detail)
    transactionMock.mockImplementation(async callback => callback({}))
  })

  it('derives the bonus, total and outcome and stores them with the marks', async () => {
    await recordExamResult(context, 'exam-1', 'evaluator-1', { ...marks, notes: 'well done' })

    expect(repository.insertResult).toHaveBeenCalledWith(
      {},
      {
        examId: 'exam-1',
        ...marks,
        childrenBonus: 0,
        total: 98,
        outcome: 'prathamaSreni',
        notes: 'well done',
        evaluatorId: 'evaluator-1',
      },
    )
  })

  it("measures age against the sitting's own year, not the year it is recorded", async () => {
    // Born 2014, sat in 2026 → 12 → +5 (the boundary a wrong year would push to 0 or +10).
    vi.mocked(repository.findStudentYearOfBirth).mockResolvedValue(2014)

    await recordExamResult(context, 'exam-1', 'evaluator-1', marks)

    expect(repository.insertResult).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ childrenBonus: 5, total: 103, outcome: 'prathamaSreni' }),
    )
  })

  it("writes the granted level to every gradable chapter of the exam's track, with no batch", async () => {
    await recordExamResult(context, 'exam-1', 'evaluator-1', { ...marks, notes: 'n' })

    expect(repository.findGradableChapterIds).toHaveBeenCalledWith({}, 'track-1')
    expect(repository.insertEvaluations).toHaveBeenCalledTimes(1)
    expect(repository.insertEvaluations).toHaveBeenCalledWith({}, [
      {
        studentId: 'student-1',
        chapterId: 'chapter-1',
        level: 'level4',
        notes: 'n',
        evaluatorId: 'evaluator-1',
      },
      {
        studentId: 'student-1',
        chapterId: 'chapter-2',
        level: 'level4',
        notes: 'n',
        evaluatorId: 'evaluator-1',
      },
    ])
  })

  it('stamps the result and its chapter evaluations with a supplied evaluatedAt', async () => {
    const evaluatedAt = new Date('2026-09-24T00:00:00Z')

    await recordExamResult(context, 'exam-1', 'evaluator-1', marks, { evaluatedAt })

    expect(repository.insertResult).toHaveBeenCalledWith({}, expect.objectContaining({ evaluatedAt }))
    expect(repository.insertEvaluations).toHaveBeenCalledWith(
      {},
      [
        expect.objectContaining({ chapterId: 'chapter-1', evaluatedAt }),
        expect.objectContaining({ chapterId: 'chapter-2', evaluatedAt }),
      ],
    )
  })

  it('a reappear stores the result but touches no chapter', async () => {
    await recordExamResult(context, 'exam-1', 'evaluator-1', {
      aksharaShuddhi: 20,
      swaraShuddhi: 15,
      niyantranaAnargalata: 10,
      shraavyata: 2,
      pratishakyaGrammar: 2,
    })

    expect(repository.insertResult).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ total: 49, outcome: 'reappear' }),
    )
    expect(repository.findGradableChapterIds).not.toHaveBeenCalled()
    expect(repository.insertEvaluations).not.toHaveBeenCalled()
  })

  it("422s when the student's year of birth isn't on file, before opening a transaction", async () => {
    vi.mocked(repository.findStudentYearOfBirth).mockResolvedValue(undefined)

    await expect(recordExamResult(context, 'exam-1', 'evaluator-1', marks)).rejects.toMatchObject({
      statusCode: 422,
    })

    expect(transactionMock).not.toHaveBeenCalled()
  })

  it.each(['completed', 'cancelled'] as const)(
    '409s for an exam already %s, before doing anything else',
    async status => {
      vi.mocked(repository.findById).mockResolvedValue({ ...existingExam, status })

      await expect(recordExamResult(context, 'exam-1', 'evaluator-1', marks)).rejects.toMatchObject(
        { statusCode: 409 },
      )

      expect(repository.findStudentYearOfBirth).not.toHaveBeenCalled()
      expect(transactionMock).not.toHaveBeenCalled()
    },
  )

  it.each([
    DbConstraint.evaluationStudentIdFk,
    DbConstraint.evaluationChapterIdFk,
    DbConstraint.evaluationEvaluatorIdFk,
  ])(
    'maps %s on the chapter evaluations to a 422 with the student/chapter/evaluator message',
    async constraint => {
      vi.mocked(repository.insertEvaluations).mockRejectedValue({
        cause: { code: '23503', constraint },
      })

      await expect(recordExamResult(context, 'exam-1', 'evaluator-1', marks)).rejects.toMatchObject(
        {
          statusCode: 422,
          message: 'student, chapter, or evaluator no longer exists',
        },
      )

      expect(transactionMock).toHaveBeenCalled()
    },
  )

  it('maps a vanished evaluator on the result itself to a 422', async () => {
    vi.mocked(repository.insertResult).mockRejectedValue({
      cause: { code: '23503', constraint: DbConstraint.examResultEvaluatorIdFk },
    })

    await expect(recordExamResult(context, 'exam-1', 'evaluator-1', marks)).rejects.toMatchObject({
      statusCode: 422,
      message: 'evaluator no longer exists',
    })

    expect(repository.insertEvaluations).not.toHaveBeenCalled()
  })

  it('calls repository.complete with existing.status as the expectedStatus argument', async () => {
    await recordExamResult(context, 'exam-1', 'evaluator-1', marks)

    expect(repository.complete).toHaveBeenCalledWith({}, 'exam-1', 'scheduled')
  })

  it('completes the exam before storing anything, so a lost race never leaves a result behind', async () => {
    await recordExamResult(context, 'exam-1', 'evaluator-1', marks)

    expect(vi.mocked(repository.complete).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(repository.insertResult).mock.invocationCallOrder[0]!,
    )
  })

  it('throws a 409 "already recorded" conflict when the follow-up read shows the exam completed', async () => {
    vi.mocked(repository.complete).mockResolvedValue(undefined)
    vi.mocked(repository.findById)
      .mockResolvedValueOnce(existingExam)
      .mockResolvedValueOnce(completedExam)

    await expect(recordExamResult(context, 'exam-1', 'evaluator-1', marks)).rejects.toMatchObject({
      statusCode: 409,
      message: 'a result was already recorded for this exam',
    })

    expect(repository.insertResult).not.toHaveBeenCalled()
    expect(repository.findById).toHaveBeenNthCalledWith(2, {}, 'exam-1')
  })

  it('throws a 409 "status changed concurrently" conflict when the follow-up read shows another status', async () => {
    vi.mocked(repository.complete).mockResolvedValue(undefined)
    vi.mocked(repository.findById)
      .mockResolvedValueOnce(existingExam)
      .mockResolvedValueOnce({ ...existingExam, status: 'cancelled' as const })

    await expect(recordExamResult(context, 'exam-1', 'evaluator-1', marks)).rejects.toMatchObject({
      statusCode: 409,
      message: 'exam status changed concurrently',
    })

    expect(repository.insertResult).not.toHaveBeenCalled()
  })

  it('throws 404 when the follow-up read finds no row', async () => {
    vi.mocked(repository.complete).mockResolvedValue(undefined)
    vi.mocked(repository.findById)
      .mockResolvedValueOnce(existingExam)
      .mockResolvedValueOnce(undefined)

    await expect(recordExamResult(context, 'exam-1', 'evaluator-1', marks)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('returns the completed exam with its detail', async () => {
    await expect(recordExamResult(context, 'exam-1', 'evaluator-1', marks)).resolves.toEqual(detail)
  })
})

describe('findByIdWithDetail', () => {
  const db = {} as SchoolDbClient
  const context = { db }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns the exam with its track/result projection', async () => {
    const detail = {
      id: 'exam-1',
      trackId: 'track-1',
      studentId: 'student-1',
      scheduledAt: new Date(),
      status: 'scheduled' as const,
      track: { id: 'track-1', name: 'Track 1' },
      result: null,
      student: { id: 'student-1', name: 'Student One' },
      }
    vi.mocked(repository.findByIdWithDetail).mockResolvedValue(detail)

    await expect(findByIdWithDetail(context, 'exam-1')).resolves.toEqual(detail)
  })

  it('throws 404 for a nonexistent exam', async () => {
    vi.mocked(repository.findByIdWithDetail).mockResolvedValue(undefined)

    await expect(findByIdWithDetail(context, 'missing')).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})
