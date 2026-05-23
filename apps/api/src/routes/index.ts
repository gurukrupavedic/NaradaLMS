import type { Router } from 'express'

import healthRouter from './health'
import tracksRouter from './tracks'
import { resolveSchoolSlug } from '../middlewares/school'

export default function setupRoutes(router: Router) {
  router.use('/health', healthRouter)
  router.use(resolveSchoolSlug).use('/tracks', tracksRouter)
}
