import { Router } from 'express'
import { z } from 'zod'

import { userIdSchema } from '@narada/auth/ids'
import { parseBody, parseParams } from '../utils/validate'
import { notFound } from '../error'
import { requireBatchAccess } from '../utils/auth'
import { findBatchById } from '../services/batch'
import { enrollSchema, enrollUser, unenrollUser } from '../services/enrollment'
import { schoolDb } from '../middlewares/school'

// mergeParams: parent path provides :batchId.
const router = Router({ mergeParams: true })

router.post('/', async (req, res) => {
  const db = schoolDb(res)
  const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
  const data = parseBody(enrollSchema, req)
  await requireBatchAccess(req, db, batchId, {
    schoolPermission: { enrollment: ['create'] },
    batchPermission: { enrollment: ['create'] },
  })

  const batch = await findBatchById(db, batchId)
  if (!batch) {
    throw notFound()
  }

  const enrolled = await enrollUser(db, batchId, data)
  res.status(201).json({ ok: true, data: enrolled })
})

router.delete('/:userId', async (req, res) => {
  const db = schoolDb(res)
  const { batchId, userId } = parseParams(
    z.object({ batchId: z.uuid(), userId: userIdSchema }),
    req,
  )

  await requireBatchAccess(req, db, batchId, {
    schoolPermission: { enrollment: ['remove'] },
    batchPermission: { enrollment: ['remove'] },
  })

  await unenrollUser(db, batchId, userId)
  res.status(204).send()
})

export default router
