import { Router } from 'express'
import { z } from 'zod'

import { parseBody, parseParams } from '../utils/validate'
import { authorize, getSession, hasPermission } from '../utils/auth'
import EvaluationService, { createEvaluationSchema } from '../services/evaluation'

const router = Router({ mergeParams: true })

router.get('/', async (req, res) => {
  const { db } = res.locals
  const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)

  const canReadEvaluations = await hasPermission(req, db, {
    scope: 'school',
    permissions: { evaluation: ['read'] },
  })

  if (!canReadEvaluations) {
    await authorize(req, db, {
      scope: 'batch',
      batchId,
      permissions: { evaluation: ['create'] },
    })
  }

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
    await authorize(req, db, {
      scope: 'batch',
      batchId,
      permissions: { evaluation: ['create'] },
    })
  } else {
    await authorize(req, db, {
      scope: 'batch',
      batchId,
      permissions: { evaluation: ['read'] },
    })
  }

  const evaluations = await EvaluationService.findByStudent(db, batchId, studentId)
  res.status(200).json({ ok: true, data: evaluations })
})

router.post('/', async (req, res) => {
  const { db } = res.locals
  const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
  const data = parseBody(createEvaluationSchema, req)

  const { user } = await authorize(req, db, {
    scope: 'batch',
    batchId,
    permissions: { evaluation: ['create'] },
  })

  const created = await EvaluationService.create(db, user.id, data)
  res.status(201).json({ ok: true, data: created })
})

export default router
