import type { Router } from 'express'
import { rateLimit } from 'express-rate-limit'

import healthRouter from './health'
import tracksRouter from './tracks'
import chaptersRouter from './chapters'
import { batchEnrollmentProfileRouter, publicProfileRouter } from './profile'
import segmentsRouter from './segments'
import batchesRouter from './batches'
import enrollmentRouter from './enrollment'
import evaluationsRouter from './evaluations'
import batchExamsRouter from './exams'
import audioRouter from './audio'
import audioMappingsRouter from './audioMappings'
import studentRouter from './student'
import schoolsRouter from './schools'
import { resolveDb, requireSchool } from '../middlewares/school'

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
    .use(requireSchool)
    .use('/tracks', tracksRouter)
    .use('/chapters', chaptersRouter)
    .use('/chapters/:chapterId/segments', segmentsRouter)
    .use('/batches', batchesRouter)
    .use('/batches/:batchId/enrollments/me', batchEnrollmentProfileRouter)
    .use('/batches/:batchId/members', enrollmentRouter)
    .use('/batches/:batchId/evaluations', evaluationsRouter)
    .use('/batches/:batchId/exams', batchExamsRouter)
    .use('/chapters/:chapterId/audio', audioRouter)
    .use('/audio', audioMappingsRouter)
    .use('/student', studentRouter)
}
