import { Router } from 'express'

import { getSession } from '../utils/auth'
import { parseBody } from '../utils/validate'
import ProfileService, { updateProfileSchema } from '../services/profile'

export const publicProfileRouter = Router()

publicProfileRouter.get('/', async (req, res) => {
  const { user } = await getSession(req)

  const profile = await ProfileService.get(user.id, user.isSuperAdmin)
  res.status(200).json({ ok: true, data: profile })
})

export const schoolProfileRouter = Router()

schoolProfileRouter.patch('/', async (req, res) => {
  const { db } = res.locals
  const updates = parseBody(updateProfileSchema, req)

  const { user } = await getSession(req)
  await ProfileService.update(db, user.id, updates)
  res.status(200).json({ ok: true })
})
