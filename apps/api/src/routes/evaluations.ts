import { Router } from 'express'
import { z } from 'zod'

import { parseBody, parseParams } from '../utils/validate'
import { getSession, requireBatchAccess } from '../utils/auth'
import EvaluationService, { createEvaluationSchema } from '../services/evaluation'

const router = Router({ mergeParams: true })

router.get('/', async (req, res) => {
  const { db } = res.locals
  const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
  await requireBatchAccess(req, db, batchId, {
    schoolPermission: { evaluation: ['read'] },
    batchPermission: { evaluation: ['create'] },
  })

  const evaluations = await EvaluationService.findByBatch(db, batchId)
  res.status(200).json({ ok: true, data: evaluations })
})

router.get('/:studentId', async (req, res) => {
  const { db } = res.locals
  const { batchId, studentId } = parseParams(
    z.object({ batchId: z.uuid(), studentId: z.string().min(1) }),
    req,
  )

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

  const evaluations = await EvaluationService.findByStudent(db, batchId, studentId)
  res.status(200).json({ ok: true, data: evaluations })
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
