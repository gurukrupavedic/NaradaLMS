import type { Router } from 'express'
import { rateLimit } from 'express-rate-limit'

import healthRouter from './health'
import tracksRouter from './tracks'
import chaptersRouter from './chapters'
import { batchEnrollmentProfileRouter, publicProfileRouter } from './profile'
import batchesRouter from './batches'
import enrollmentRouter from './enrollment'
import evaluationsRouter from './evaluations'
import examsRouter from './exams'
import schoolsRouter from './schools'
import { resolveDb } from '../middlewares/school'

const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

export default function setupRoutes(router: Router) {
  router.use('/health', healthRouter)

  router.use(apiRateLimit)
  router.use(resolveDb)
  router.use('/schools', schoolsRouter)
  router.use('/profile', publicProfileRouter)
  router
    .use('/tracks', tracksRouter)
    .use('/chapters', chaptersRouter)
    .use('/batches', batchesRouter)
    .use('/batches/:batchId/enrollments/me', batchEnrollmentProfileRouter)
    .use('/batches/:batchId/members', enrollmentRouter)
    .use('/batches/:batchId/evaluations', evaluationsRouter)
    .use('/exams', examsRouter)
}
