import { Router } from 'express'
import { z } from 'zod'

import { parseBody, parseParams } from '../utils/validate'
import { notFound } from '../error'
import { authorize, hasPermission } from '../utils/auth'
import BatchService from '../services/batch'
import EnrollmentService, { enrollSchema } from '../services/enrollment'

const router = Router({ mergeParams: true })

router.post('/', async (req, res) => {
  const { db } = res.locals
  const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
  const data = parseBody(enrollSchema, req)

  const canManageEnrollment = await hasPermission(req, db, {
    scope: 'school',
    permissions: { enrollment: ['create'] },
  })

  if (!canManageEnrollment) {
    await authorize(req, db, {
      scope: 'batch',
      batchId,
      permissions: { enrollment: ['create'] },
    })
  }

  const batch = await BatchService.findById(db, batchId)
  if (!batch) {
    throw notFound()
  }

  const enrolled = await EnrollmentService.enroll(db, batchId, data)
  res.status(201).json({ ok: true, data: enrolled })
})

router.delete('/:userId', async (req, res) => {
  const { db } = res.locals
  const { batchId, userId } = parseParams(
    z.object({ batchId: z.uuid(), userId: z.string().min(1) }),
    req,
  )

  const canManageEnrollment = await hasPermission(req, db, {
    scope: 'school',
    permissions: { enrollment: ['remove'] },
  })

  if (!canManageEnrollment) {
    await authorize(req, db, {
      scope: 'batch',
      batchId,
      permissions: { enrollment: ['remove'] },
    })
  }

  await EnrollmentService.unenroll(db, batchId, userId)
  res.status(200).json({ ok: true })
})

export default router
