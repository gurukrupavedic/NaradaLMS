import { Router } from 'express'

import { parseBody } from '../utils/validate'
import ProfileService, { updateProfileSchema } from '../services/profile'

export const publicProfileRouter = Router()

publicProfileRouter.get('/', async (req, res) => {
  const { authClient } = res.locals
  const { user } = await authClient.getSession()

  const profile = await ProfileService.get(user.id, user.isSuperAdmin)
  res.status(200).json({ ok: true, data: profile })
})

export const schoolProfileRouter = Router()

schoolProfileRouter.patch('/', async (req, res) => {
  const { db, authClient } = res.locals
  const updates = parseBody(updateProfileSchema, req)

  const { user } = await authClient.getSession()
  await ProfileService.update(db, user.id, updates)
  res.status(200).json({ ok: true })
})
