import { Router } from 'express'

import { profileRoute } from '../naradaRoute'
import { getDashboardData } from '../services/dashboard'

const router = Router()

router.get(
  '/dashboard',
  profileRoute(async ({ res, ctx, profile }) => {
    const data = await getDashboardData(ctx.db, profile.id, profile.name)
    res.status(200).json({ ok: true, data })
  }),
)

export default router
