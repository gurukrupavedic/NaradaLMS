import { Router } from 'express'
import { z } from 'zod'

import { parseBody, parseParams, parseQuery } from '../utils/validate'
import { forbidden, notFound } from '../error'
import { authorize, getSession, hasPermission } from '../utils/auth'
import BatchService, {
  createBatchSchema,
  listBatchesQuerySchema,
  updateBatchSchema,
} from '../services/batch'
import EnrollmentService from '../services/enrollment'

const router = Router()

router.get('/', async (req, res) => {
  const { db } = res.locals
  const query = parseQuery(listBatchesQuerySchema, req)

  await authorize(req, db, { scope: 'school', permissions: { batch: ['read'] } })
  const { user } = await getSession(req)
  const canManageBatches = await hasPermission(req, db, {
    scope: 'school',
    permissions: { batch: ['update'] },
  })
  const result = await BatchService.findAll(db, {
    ...query,
    showAll: canManageBatches,
    userId: user.id,
  })

  res.status(200).json({ ok: true, data: result })
})

router.get('/:batchId', async (req, res) => {
  const { db } = res.locals
  const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)

  await authorize(req, db, { scope: 'school', permissions: { batch: ['read'] } })
  const canManageBatches = await hasPermission(req, db, {
    scope: 'school',
    permissions: { batch: ['update'] },
  })
  if (!canManageBatches) {
    const { user } = await getSession(req)
    const enrollment = await EnrollmentService.findOne(db, user.id, batchId)
    if (!enrollment) {
      throw forbidden()
    }
  }

  const batchDetail = await BatchService.findByIdWithMembers(db, batchId)
  if (!batchDetail) {
    throw notFound()
  }

  res.status(200).json({ ok: true, data: batchDetail })
})

router.post('/', async (req, res) => {
  const { db } = res.locals
  const data = parseBody(createBatchSchema, req)

  await authorize(req, db, { scope: 'school', permissions: { batch: ['create'] } })
  const created = await BatchService.create(db, data)
  res.status(201).json({ ok: true, data: created })
})

router.patch('/:batchId', async (req, res) => {
  const { db } = res.locals
  const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
  const updates = parseBody(updateBatchSchema, req)

  await authorize(req, db, { scope: 'school', permissions: { batch: ['update'] } })
  const existing = await BatchService.findById(db, batchId)
  if (!existing) {
    throw notFound()
  }

  const updated = await BatchService.update(db, batchId, updates)
  res.status(200).json({ ok: true, data: updated })
})

export default router
