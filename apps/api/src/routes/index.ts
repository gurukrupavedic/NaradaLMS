import type { Router } from 'express'

import healthRouter from './health'
import tracksRouter from './tracks'
import chaptersRouter from './chapters'
import { publicProfileRouter, schoolProfileRouter } from './profile'
import segmentsRouter from './segments'
import batchesRouter from './batches'
import enrollmentRouter from './enrollment'
import evaluationsRouter from './evaluations'
import { batchExamsRouter, examsRouter } from './exams'
import audioMappingsRouter from './audioMappings'
import studentRouter from './student'
import { resolveDb, requireSchool } from '../middlewares/school'
import { resolveAuth } from '../middlewares/auth'

export default function setupRoutes(router: Router) {
  router.use('/health', healthRouter)

  router.use(resolveDb)
  router.use(resolveAuth)
  router.use('/profile', publicProfileRouter)
  router
    .use(requireSchool)
    .use('/tracks', tracksRouter)
    .use('/chapters', chaptersRouter)
    .use('/profile', schoolProfileRouter)
    .use('/chapters/:chapterId/segments', segmentsRouter)
    .use('/batches', batchesRouter)
    .use('/batches/:batchId/members', enrollmentRouter)
    .use('/batches/:batchId/evaluations', evaluationsRouter)
    .use('/batches/:batchId/exams', batchExamsRouter)
    .use('/exams', examsRouter)
    .use('/audio', audioMappingsRouter)
    .use('/student', studentRouter)
}
