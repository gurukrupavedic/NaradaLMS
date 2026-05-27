import { Router } from 'express'
import { z } from 'zod'

import { parseBody, parseParams, parseQuery } from '../utils/validate'
import { notFound } from '../error'
import { requireBatchAccess } from '../utils/auth'
import ExamService, {
  createExamSchema,
  listExamsQuerySchema,
  recordResultsSchema,
  updateExamSchema,
} from '../services/exam'
import { schoolDb } from '../middlewares/school'

export const batchExamsRouter = Router({ mergeParams: true })

batchExamsRouter.get('/', async (req, res) => {
  const db = schoolDb(res)
  const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
  const query = parseQuery(listExamsQuerySchema, req)
  const access = await requireBatchAccess(req, db, batchId, {
    batchPermission: { exam: ['read'] },
  })

  const result = await ExamService.findByBatch(db, batchId, { ...query, access })
  res.status(200).json({ ok: true, data: result })
})

batchExamsRouter.post('/', async (req, res) => {
  const db = schoolDb(res)
  const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
  const data = parseBody(createExamSchema, req)
  await requireBatchAccess(req, db, batchId, { batchPermission: { exam: ['create'] } })
  const created = await ExamService.create(db, batchId, data)
  res.status(201).json({ ok: true, data: created })
})

export const examsRouter = Router()

examsRouter.patch('/:examId', async (req, res) => {
  const db = schoolDb(res)
  const { examId } = parseParams(z.object({ examId: z.uuid() }), req)
  const updates = parseBody(updateExamSchema, req)

  const existing = await ExamService.findById(db, examId)
  if (!existing) {
    throw notFound()
  }

  await requireBatchAccess(req, db, existing.batchId, {
    batchPermission: { exam: ['update'] },
  })

  const updated = await ExamService.update(db, examId, updates)
  res.status(200).json({ ok: true, data: updated })
})

examsRouter.post('/:examId/results', async (req, res) => {
  const db = schoolDb(res)
  const { examId } = parseParams(z.object({ examId: z.uuid() }), req)
  const items = parseBody(recordResultsSchema, req)
  const existing = await ExamService.findById(db, examId)
  if (!existing) {
    throw notFound()
  }

  const access = await requireBatchAccess(req, db, existing.batchId, {
    batchPermission: { exam: ['update'] },
  })

  const result = await ExamService.recordResults(db, examId, access.userId, items)
  res.status(200).json({ ok: true, data: result })
})
