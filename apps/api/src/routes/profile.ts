import { Router } from 'express'
import { fromNodeHeaders } from 'better-auth/node'

import { auth } from '@narada/auth'
import AuthClient from '../utils/auth'
import { parseBody } from '../utils/validate'
import { unauthorized } from '../error'
import ProfileService, { updateProfileSchema } from '../services/profile'

export const publicProfileRouter = Router()

publicProfileRouter.get('/', async (req, res) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
  if (!session) {
    throw unauthorized()
  }

  const profile = await ProfileService.get(session.user.id, session.user.isSuperAdmin)
  res.status(200).json({ ok: true, data: profile })
})

export const schoolProfileRouter = Router()

schoolProfileRouter.patch('/', async (req, res) => {
  const updates = parseBody(updateProfileSchema, req)

  const db = res.locals.db
  const authClient = new AuthClient(req, db)
  const { user } = await authClient.getSession()

  await ProfileService.update(db, user.id, updates)
  res.status(200).json({ ok: true })
})
