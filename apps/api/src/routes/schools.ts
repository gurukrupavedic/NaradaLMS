import { Router } from 'express'
import { z } from 'zod'

import { parseBody, parseParams } from '../utils/validate'
import { forbidden, notFound } from '../error'
import SchoolService, { createSchoolSchema, updateSchoolSchema } from '../services/school'

const router = Router()

router.get('/', async (req, res) => {
  const { authClient } = res.locals

  const { user } = await authClient.getSession()
  if (!user.isSuperAdmin) {
    throw forbidden()
  }

  const schools = await SchoolService.findAll()
  res.status(200).json({ ok: true, data: schools })
})

router.post('/', async (req, res) => {
  const { authClient } = res.locals
  const data = parseBody(createSchoolSchema, req)

  const { user } = await authClient.getSession()
  if (!user.isSuperAdmin) {
    throw forbidden()
  }

  const created = await SchoolService.create(data)
  res.status(201).json({ ok: true, data: created })
})

router.patch('/:schoolId', async (req, res) => {
  const { authClient } = res.locals
  const { schoolId } = parseParams(z.object({ schoolId: z.string().min(1) }), req)
  const updates = parseBody(updateSchoolSchema, req)

  const { user } = await authClient.getSession()
  if (!user.isSuperAdmin) {
    throw forbidden()
  }

  const existing = await SchoolService.findById(schoolId)
  if (!existing) {
    throw notFound()
  }

  const updated = await SchoolService.update(schoolId, updates)
  res.status(200).json({ ok: true, data: updated })
})

export default router
