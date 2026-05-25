import { Router } from 'express'
import { z } from 'zod'

import { parseBody, parseParams } from '../utils/validate'
import EvaluationService, { createEvaluationSchema } from '../services/evaluation'

const router = Router({ mergeParams: true })

router.get('/', async (req, res) => {
  const { db, authClient } = res.locals
  const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)

  const canReadEvaluations = await authClient.hasSchoolPermissions({ evaluation: ['read'] })
  if (!canReadEvaluations) {
    await authClient.ensureBatchPermissions({ evaluation: ['create'] }, batchId)
  }

  const evaluations = await EvaluationService.findByBatch(db, batchId)
  res.status(200).json({ ok: true, data: evaluations })
})

router.get('/:studentId', async (req, res) => {
  const { db, authClient } = res.locals
  const { batchId, studentId } = parseParams(
    z.object({ batchId: z.uuid(), studentId: z.string().min(1) }),
    req,
  )

  const { user } = await authClient.getSession()
  if (studentId !== user.id) {
    await authClient.ensureBatchPermissions({ evaluation: ['create'] }, batchId)
  } else {
    await authClient.ensureBatchPermissions({ evaluation: ['read'] }, batchId)
  }

  const evaluations = await EvaluationService.findByStudent(db, batchId, studentId)
  res.status(200).json({ ok: true, data: evaluations })
})

router.post('/', async (req, res) => {
  const { db, authClient } = res.locals
  const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
  const data = parseBody(createEvaluationSchema, req)

  await authClient.ensureBatchPermissions({ evaluation: ['create'] }, batchId)
  const { user } = await authClient.getSession()
  const created = await EvaluationService.create(db, user.id, data)
  res.status(201).json({ ok: true, data: created })
})

export default router
