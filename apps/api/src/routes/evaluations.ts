import { Router } from 'express'
import { z } from 'zod'

import { userIdSchema } from '@narada/auth/ids'
import type { BatchPermissions } from '@narada/auth/permissions'
import { schoolRoute } from '../naradaRoute'
import { parseBody, parseParams, parseQuery } from '../utils/validate'
import { getBatchAccess, getSession, requireAccess } from '../utils/auth'
import {
  createEvaluation,
  createEvaluationSchema,
  findEvaluationsByBatch,
  findEvaluationsByStudent,
  listEvaluationsQuerySchema,
} from '../services/evaluation'
import { findBatchById } from '../services/batch'
import { findEnrollment } from '../services/enrollment'
import { notFound, unprocessable } from '../error'

// mergeParams: parent path provides :batchId.
const router = Router({ mergeParams: true })

router.get(
  '/',
  schoolRoute(async ({ req, res, ctx }) => {
    const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
    const query = parseQuery(listEvaluationsQuerySchema, req)
    await requireAccess(
      getBatchAccess(req, ctx.db, batchId, {
        schoolPermission: { evaluation: ['read'] },
        batchPermission: { evaluation: ['create'] },
      }),
    )

    const result = await findEvaluationsByBatch(ctx.db, batchId, query)
    res.status(200).json({ ok: true, data: result })
  }),
)

router.get(
  '/:studentId',
  schoolRoute(async ({ req, res, ctx }) => {
    const { batchId, studentId } = parseParams(
      z.object({ batchId: z.uuid(), studentId: userIdSchema }),
      req,
    )

    const query = parseQuery(listEvaluationsQuerySchema, req)
    const { user } = await getSession(req)
    const batchPermission = (
      studentId === user.id ? { evaluation: ['read'] } : { evaluation: ['create'] }
    ) satisfies BatchPermissions

    await requireAccess(
      getBatchAccess(req, ctx.db, batchId, {
        schoolPermission: { evaluation: ['read'] },
        batchPermission,
      }),
    )

    const result = await findEvaluationsByStudent(ctx.db, batchId, studentId, query)
    res.status(200).json({ ok: true, data: result })
  }),
)

router.post(
  '/',
  schoolRoute(async ({ req, res, ctx }) => {
    const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
    const data = parseBody(createEvaluationSchema, req)
    const access = await requireAccess(
      getBatchAccess(req, ctx.db, batchId, {
        batchPermission: { evaluation: ['create'] },
      }),
    )

    const studentEnrollment = await findEnrollment(ctx.db, data.studentId, batchId)
    if (!studentEnrollment || studentEnrollment.role !== 'student') {
      throw unprocessable('student is not enrolled in this batch')
    }

    const chapter = await ctx.db.query.chapter.findFirst({
      where: (t, { eq }) => eq(t.id, data.chapterId),
      columns: { trackId: true },
    })

    if (!chapter) throw notFound()
    const batch = await findBatchById(ctx.db, batchId)
    if (!batch) throw notFound()
    if (chapter.trackId !== batch.trackId) {
      throw unprocessable('chapter does not belong to this batch track')
    }

    const created = await createEvaluation(ctx.db, access.userId, data)
    res.status(201).json({ ok: true, data: created })
  }),
)

export default router
