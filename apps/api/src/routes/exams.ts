import { Router } from 'express'
import { z } from 'zod'

import { schoolRoute } from '../naradaRoute'
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

const router = Router()

router.get(
  '/',
  schoolRoute(async ({ req, res, ctx }) => {
    const query = parseQuery(listExamsQuerySchema, req)
    const { user } = await getSession(req)
    const result = user.isSuperAdmin
      ? await findAllExams(ctx.db, query)
      : await findVisibleExamsForUser(ctx.db, user.id, query)

    res.status(200).json({ ok: true, data: result })
  }),
)

router.post(
  '/',
  schoolRoute(async ({ req, res, ctx }) => {
    const data = parseBody(createExamSchema, req)
    const { user } = await getSession(req)
    if (!user.isSuperAdmin && !(await canManageExam(ctx.db, user.id, data))) {
      throw forbidden()
    }

    const created = await createExam(ctx.db, data)
    res.status(201).json({ ok: true, data: created })
  }),
)

router.patch(
  '/:examId',
  schoolRoute(async ({ req, res, ctx }) => {
    const { examId } = parseParams(z.object({ examId: z.uuid() }), req)
    const updates = parseBody(updateExamSchema, req)
    const { user } = await getSession(req)
    const existing = await findExamById(ctx.db, examId)
    if (!existing) throw notFound()

    const canManage = await canManageExam(ctx.db, user.id, existing)
    if (!user.isSuperAdmin && !canManage) {
      throw forbidden()
    }

    const updated = await updateExam(ctx.db, examId, updates)
    res.status(200).json({ ok: true, data: updated })
  }),
)

router.post(
  '/:examId/results',
  schoolRoute(async ({ req, res, ctx }) => {
    const { examId } = parseParams(z.object({ examId: z.uuid() }), req)
    const data = parseBody(recordResultSchema, req)
    const { user } = await getSession(req)

    const existing = await findExamById(ctx.db, examId)
    if (!existing) throw notFound()

    const canManage = await canManageExam(ctx.db, user.id, existing)
    if (!user.isSuperAdmin && !canManage) {
      throw forbidden()
    }

    const result = await recordExamResult(ctx.db, examId, user.id, data)
    res.status(200).json({ ok: true, data: result })
  }),
)

export default router
