import { Router } from 'express'

import { publicRoute } from '../naradaRoute'
import { getSession } from '../utils/auth'
import { getAuthProfile } from '../services/authProfile'

export const publicProfileRouter = Router()

publicProfileRouter.get(
  '/',
  publicRoute(async ({ req, res }) => {
    const { user } = await getSession(req)
    const profile = await getAuthProfile(user.id, user.isSuperAdmin)
    res.status(200).json({ ok: true, data: profile })
  }),
)
