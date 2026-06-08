import { Router } from 'express'
import { z } from 'zod'

import { parseBody, parseParams, parseQuery } from '../utils/validate'
import { forbidden, notFound } from '../error'
import { getSession } from '../utils/auth'
import {
  canManageExam,
  createExam,
  createExamSchema,
  findAllExams,
  findExamById,
  findVisibleExamsForUser,
  listExamsQuerySchema,
  recordExamResult,
  recordResultSchema,
  updateExam,
  updateExamSchema,
} from '../services/exam'
import { schoolDb } from '../middlewares/school'

const router = Router()

router.get('/', async (req, res) => {
  const db = schoolDb(res)
  const query = parseQuery(listExamsQuerySchema, req)
  const { user } = await getSession(req)
  const result = user.isSuperAdmin
    ? await findAllExams(db, query)
    : await findVisibleExamsForUser(db, user.id, query)

  res.status(200).json({ ok: true, data: result })
})

router.post('/', async (req, res) => {
  const db = schoolDb(res)
  const data = parseBody(createExamSchema, req)
  const { user } = await getSession(req)
  if (!user.isSuperAdmin && !(await canManageExam(db, user.id, data))) {
    throw forbidden()
  }

  const created = await createExam(db, data)
  res.status(201).json({ ok: true, data: created })
})

router.patch('/:examId', async (req, res) => {
  const db = schoolDb(res)
  const { examId } = parseParams(z.object({ examId: z.uuid() }), req)
  const updates = parseBody(updateExamSchema, req)
  const { user } = await getSession(req)
  const existing = await findExamById(db, examId)
  if (!existing) throw notFound()

  const canManage = await canManageExam(db, user.id, existing)
  if (!user.isSuperAdmin && !canManage) {
    throw forbidden()
  }

  const updated = await updateExam(db, examId, updates)
  res.status(200).json({ ok: true, data: updated })
})

router.post('/:examId/results', async (req, res) => {
  const db = schoolDb(res)
  const { examId } = parseParams(z.object({ examId: z.uuid() }), req)
  const data = parseBody(recordResultSchema, req)
  const { user } = await getSession(req)

  const existing = await findExamById(db, examId)
  if (!existing) throw notFound()

  const canManage = await canManageExam(db, user.id, existing)
  if (!user.isSuperAdmin && !canManage) {
    throw forbidden()
  }

  const result = await recordExamResult(db, examId, user.id, data)
  res.status(200).json({ ok: true, data: result })
})

export default router
