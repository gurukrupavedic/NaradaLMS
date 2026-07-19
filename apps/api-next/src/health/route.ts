import { sql } from 'drizzle-orm'
import { Router } from 'express'

import { publicRoute } from '../naradaRoute'

const router = Router()

router.get(
  '/',
  publicRoute(async ({ res }) => {
    res.status(200).json({ status: 'up' })
  }),
)

router.get(
  '/ready',
  publicRoute(async ({ res, db }) => {
    await db.execute(sql`select 1`)
    res.status(200).json({
      status: 'ready',
      checks: { database: 'up' },
    })
  }),
)

export default router
