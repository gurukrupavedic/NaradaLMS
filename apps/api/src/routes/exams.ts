import { Router } from 'express'
import { z } from 'zod'

import { parseBody, parseParams, parseQuery } from '../utils/validate'
import { notFound } from '../error'
import ExamService, {
  createExamSchema,
  listExamsQuerySchema,
  recordResultsSchema,
  updateExamSchema,
} from '../services/exam'

export const batchExamsRouter = Router({ mergeParams: true })

batchExamsRouter.get('/', async (req, res) => {
  const { db, authClient } = res.locals
  const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
  const query = parseQuery(listExamsQuerySchema, req)

  await authClient.ensureBatchPermissions({ exam: ['read'] }, batchId)
  const { user } = await authClient.getSession()
  const showAll = await authClient.hasBatchPermissions({ exam: ['update'] }, batchId)
  const result = await ExamService.findByBatch(db, batchId, { ...query, userId: user.id, showAll })

  res.status(200).json({ ok: true, data: result })
})

batchExamsRouter.post('/', async (req, res) => {
  const { db, authClient } = res.locals
  const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
  const data = parseBody(createExamSchema, req)

  await authClient.ensureBatchPermissions({ exam: ['create'] }, batchId)
  const created = await ExamService.create(db, batchId, data)
  res.status(201).json({ ok: true, data: created })
})

export const examsRouter = Router()

examsRouter.patch('/:examId', async (req, res) => {
  const { db, authClient } = res.locals
  const { examId } = parseParams(z.object({ examId: z.uuid() }), req)
  const updates = parseBody(updateExamSchema, req)

  const existing = await ExamService.findById(db, examId)
  if (!existing) {
    throw notFound()
  }

  await authClient.ensureBatchPermissions({ exam: ['update'] }, existing.batchId)
  const updated = await ExamService.update(db, examId, updates)
  res.status(200).json({ ok: true, data: updated })
})

examsRouter.post('/:examId/results', async (req, res) => {
  const { db, authClient } = res.locals
  const { examId } = parseParams(z.object({ examId: z.uuid() }), req)
  const items = parseBody(recordResultsSchema, req)

  const existing = await ExamService.findById(db, examId)
  if (!existing) {
    throw notFound()
  }

  await authClient.ensureBatchPermissions({ exam: ['update'] }, existing.batchId)
  const { user } = await authClient.getSession()
  const result = await ExamService.recordResults(db, examId, user.id, items)
  res.status(200).json({ ok: true, data: result })
})
