import { sql } from 'drizzle-orm'
import { Router } from 'express'

import { env } from '@narada/env'

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
    let timer: NodeJS.Timeout | undefined
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('readiness check timed out')),
        env.DB_READY_TIMEOUT_MS,
      )
    })

    try {
      await Promise.race([db.execute(sql`select 1`), deadline])
    } catch {
      res.status(503).json({ status: 'not ready', checks: { database: 'down' } })
      return
    } finally {
      clearTimeout(timer)
    }

    res.status(200).json({ status: 'ready', checks: { database: 'up' } })
  }),
)

export default router
