import { Router } from 'express'
import { z } from 'zod'

import { profileRoute, schoolRoute } from '../naradaRoute'
import { parseBody, parseParams, parseQuery } from '../utils/validate'
import { forbidden, notFound } from '../error'
import { hasPermission, tryGetActorProfile } from '../utils/auth'
import {
  canManageExam,
  createExam,
  createExamSchema,
  findAllExams,
  findExamById,
  findVisibleExamsForProfile,
  listExamsQuerySchema,
  recordExamResult,
  recordResultSchema,
  updateExam,
  updateExamSchema,
  validateExamInput,
} from '../services/exam'

const router = Router()

router.get(
  '/',
  schoolRoute(async ({ req, res, ctx }) => {
    const query = parseQuery(listExamsQuerySchema, req)
    const { user, profile } = await tryGetActorProfile(req, ctx.db)
    if (user.isSuperAdmin) {
      res.status(200).json({ ok: true, data: await findAllExams(ctx.db, query) })
      return
    }

    if (profile) {
      res
        .status(200)
        .json({ ok: true, data: await findVisibleExamsForProfile(ctx.db, profile.id, query) })
      return
    }

    // Org admin without an active profile — require school-level permission to see all
    const canSeeAll = await hasPermission(req, {
      scope: 'school',
      permissions: { evaluation: ['read'] },
    })
    if (!canSeeAll) {
      throw forbidden()
    }

    res.status(200).json({ ok: true, data: await findAllExams(ctx.db, query) })
  }),
)

router.post(
  '/',
  profileRoute(async ({ req, res, ctx, user, profile }) => {
    const data = parseBody(createExamSchema, req)
    if (user.isSuperAdmin) {
      await validateExamInput(ctx.db, data)
    } else if (!(await canManageExam(ctx.db, profile.id, data))) {
      throw forbidden()
    }

    const created = await createExam(ctx.db, data)
    res.status(201).json({ ok: true, data: created })
  }),
)

router.patch(
  '/:examId',
  profileRoute(async ({ req, res, ctx, user, profile }) => {
    const { examId } = parseParams(z.object({ examId: z.uuid() }), req)
    const updates = parseBody(updateExamSchema, req)

    const existing = await findExamById(ctx.db, examId)
    if (!existing) {
      throw notFound()
    }

    const canManage = await canManageExam(ctx.db, profile.id, existing)
    if (!user.isSuperAdmin && !canManage) {
      throw forbidden()
    }

    const updated = await updateExam(ctx.db, examId, updates)
    res.status(200).json({ ok: true, data: updated })
  }),
)

router.post(
  '/:examId/results',
  profileRoute(async ({ req, res, ctx, user, profile }) => {
    const { examId } = parseParams(z.object({ examId: z.uuid() }), req)
    const data = parseBody(recordResultSchema, req)

    const existing = await findExamById(ctx.db, examId)
    if (!existing) {
      throw notFound()
    }

    const canManage = await canManageExam(ctx.db, profile.id, existing)
    if (!user.isSuperAdmin && !canManage) {
      throw forbidden()
    }

    const result = await recordExamResult(ctx.db, existing, profile.id, data)
    res.status(200).json({ ok: true, data: result })
  }),
)

export default router
