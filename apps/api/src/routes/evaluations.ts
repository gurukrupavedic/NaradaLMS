import { Router } from 'express'
import { z } from 'zod'

import { parseBody, parseParams, parseQuery } from '../utils/validate'
import { getSession, requireBatchAccess } from '../utils/auth'
import EvaluationService, {
  createEvaluationSchema,
  listEvaluationsQuerySchema,
} from '../services/evaluation'

const router = Router({ mergeParams: true })

router.get('/', async (req, res) => {
  const { db } = res.locals
  const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
  const query = parseQuery(listEvaluationsQuerySchema, req)
  await requireBatchAccess(req, db, batchId, {
    schoolPermission: { evaluation: ['read'] },
    batchPermission: { evaluation: ['create'] },
  })

  const result = await EvaluationService.findByBatch(db, batchId, query)
  res.status(200).json({ ok: true, data: result })
})

router.get('/:studentId', async (req, res) => {
  const { db } = res.locals
  const { batchId, studentId } = parseParams(
    z.object({ batchId: z.uuid(), studentId: z.string().min(1) }),
    req,
  )

  const query = parseQuery(listEvaluationsQuerySchema, req)
  const { user } = await getSession(req)
  if (studentId !== user.id) {
    await requireBatchAccess(req, db, batchId, {
      schoolPermission: { evaluation: ['read'] },
      batchPermission: { evaluation: ['create'] },
    })
  } else {
    await requireBatchAccess(req, db, batchId, {
      schoolPermission: { evaluation: ['read'] },
      batchPermission: { evaluation: ['read'] },
    })
  }

  const result = await EvaluationService.findByStudent(db, batchId, studentId, query)
  res.status(200).json({ ok: true, data: result })
})

router.post('/', async (req, res) => {
  const { db } = res.locals
  const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
  const data = parseBody(createEvaluationSchema, req)
  const access = await requireBatchAccess(req, db, batchId, {
    batchPermission: { evaluation: ['create'] },
  })

  const created = await EvaluationService.create(db, access.userId, data)
  res.status(201).json({ ok: true, data: created })
})

export default router
