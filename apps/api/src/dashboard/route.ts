import { Router } from 'express'

import { profileRoute } from '../naradaRoute'
import { getDashboardData } from './service'

const router = Router()

router.get(
  '/',
  profileRoute(async ({ res, db, profile, getCourse }) => {
    const data = await getDashboardData({ db }, profile.id, profile.name, (await getCourse())?.id)
    res.status(200).json({ data })
  }),
)

export default router
