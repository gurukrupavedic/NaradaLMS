import { Router } from 'express'
import { sql } from 'drizzle-orm'

import { publicDb } from '@narada/db'

const router = Router()

router.get('/', async (_, res) => {
  res.status(200).json({
    status: 'up',
  })
})

router.get('/ready', async (_, res) => {
  await publicDb.execute(sql`select 1`)
  res.status(200).json({
    status: 'ready',
    checks: {
      database: 'up',
    },
  })
})

export default router
