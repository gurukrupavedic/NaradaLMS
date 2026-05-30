import { Router } from 'express'
import { z } from 'zod'

import { parseBody, parseParams } from '../utils/validate'
import { notFound } from '../error'
import { authorize } from '../utils/auth'
import SchoolService, { updateSchoolSchema } from '../services/school'

const router = Router()

router.get('/', async (req, res) => {
  await authorize(req, { scope: 'super' })
  const schools = await SchoolService.findAll()
  res.status(200).json({ ok: true, data: schools })
})

router.patch('/:schoolId', async (req, res) => {
  const { schoolId } = parseParams(z.object({ schoolId: z.string().min(1) }), req)
  const updates = parseBody(updateSchoolSchema, req)

  await authorize(req, { scope: 'super' })
  const existing = await SchoolService.findById(schoolId)
  if (!existing) {
    throw notFound()
  }

  const updated = await SchoolService.update(schoolId, updates)
  res.status(200).json({ ok: true, data: updated })
})

export default router
