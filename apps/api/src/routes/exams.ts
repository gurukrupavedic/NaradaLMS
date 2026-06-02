import { Router } from 'express'
import { z } from 'zod'

import { parseBody, parseParams, parseQuery } from '../utils/validate'
import { forbidden, notFound } from '../error'
import { getSession } from '../utils/auth'
import ExamService, {
  createExamSchema,
  listExamsQuerySchema,
  recordResultSchema,
  updateExamSchema,
} from '../services/exam'
import { schoolDb } from '../middlewares/school'

const router = Router()

router.get('/', async (req, res) => {
  const db = schoolDb(res)
  const query = parseQuery(listExamsQuerySchema, req)
  const { user } = await getSession(req)
  const result = user.isSuperAdmin
    ? await ExamService.findAll(db, query)
    : await ExamService.findVisibleForUser(db, user.id, query)

  res.status(200).json({ ok: true, data: result })
})

router.post('/', async (req, res) => {
  const db = schoolDb(res)
  const data = parseBody(createExamSchema, req)
  const { user } = await getSession(req)
  if (!user.isSuperAdmin && !(await ExamService.canManage(db, user.id, data))) {
    throw forbidden()
  }

  const created = await ExamService.create(db, data)
  res.status(201).json({ ok: true, data: created })
})

router.patch('/:examId', async (req, res) => {
  const db = schoolDb(res)
  const { examId } = parseParams(z.object({ examId: z.uuid() }), req)
  const updates = parseBody(updateExamSchema, req)
  const { user } = await getSession(req)
  const existing = await ExamService.findById(db, examId)
  if (!existing) throw notFound()

  const canManage = await ExamService.canManage(db, user.id, existing)
  if (!user.isSuperAdmin && !canManage) {
    throw forbidden()
  }

  const updated = await ExamService.update(db, examId, updates)
  res.status(200).json({ ok: true, data: updated })
})

router.post('/:examId/results', async (req, res) => {
  const db = schoolDb(res)
  const { examId } = parseParams(z.object({ examId: z.uuid() }), req)
  const data = parseBody(recordResultSchema, req)
  const { user } = await getSession(req)

  const existing = await ExamService.findById(db, examId)
  if (!existing) throw notFound()

  const canManage = await ExamService.canManage(db, user.id, existing)
  if (!user.isSuperAdmin && !canManage) {
    throw forbidden()
  }

  const result = await ExamService.recordResult(db, examId, user.id, data)
  res.status(200).json({ ok: true, data: result })
})

export default router
