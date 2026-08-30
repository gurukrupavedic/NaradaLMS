import { Router } from 'express'

import { authRoute } from '../naradaRoute'
import { getAuthProfile } from './service'

const router = Router()

router.get(
  '/',
  authRoute(async ({ res, db, user }) => {
    const profile = await getAuthProfile(db, user.id, user.isSuperAdmin)
    res.status(200).json({ data: profile })
  }),
)

export default router
