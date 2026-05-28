import { Router } from 'express'
import { z } from 'zod'

import { parseBody, parseParams, parseQuery } from '../utils/validate'
import { notFound } from '../error'
import { authorize, requireBatchAccess, requireBatchListAccess } from '../utils/auth'
import BatchService, {
  createBatchSchema,
  listBatchesQuerySchema,
  updateBatchSchema,
} from '../services/batch'
import { schoolDb } from '../middlewares/school'

const router = Router()

router.get('/', async (req, res) => {
  const db = schoolDb(res)
  const query = parseQuery(listBatchesQuerySchema, req)
  const access = await requireBatchListAccess(req, db, {
    schoolPermission: { batch: ['read'] },
    allBatchesPermission: { batch: ['update'] },
  })

  const result = await BatchService.findAll(db, { ...query, access })
  res.status(200).json({ ok: true, data: result })
})

router.get('/:batchId', async (req, res) => {
  const db = schoolDb(res)
  const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
  await requireBatchAccess(req, db, batchId, {
    schoolPermission: { batch: ['update'] },
    batchPermission: { enrollment: ['read'] },
  })

  const batchDetail = await BatchService.findByIdWithMembers(db, batchId)
  if (!batchDetail) {
    throw notFound()
  }

  res.status(200).json({ ok: true, data: batchDetail })
})

router.post('/', async (req, res) => {
  const db = schoolDb(res)
  const data = parseBody(createBatchSchema, req)

  await authorize(req, { scope: 'school', permissions: { batch: ['create'] } })
  const created = await BatchService.create(db, data)
  res.status(201).json({ ok: true, data: created })
})

router.patch('/:batchId', async (req, res) => {
  const db = schoolDb(res)
  const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
  const updates = parseBody(updateBatchSchema, req)

  await authorize(req, { scope: 'school', permissions: { batch: ['update'] } })
  const existing = await BatchService.findById(db, batchId)
  if (!existing) {
    throw notFound()
  }

  const updated = await BatchService.update(db, batchId, updates)
  res.status(200).json({ ok: true, data: updated })
})

export default router
