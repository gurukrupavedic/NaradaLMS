import type { Router } from 'express'

import healthRouter from './health'

export default function setupRoutes(router: Router) {
  router.use('/health', healthRouter)
}
