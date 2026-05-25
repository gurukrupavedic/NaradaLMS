import type { Router } from 'express'

import healthRouter from './health'
import tracksRouter from './tracks'
import chaptersRouter from './chapters'
import { publicProfileRouter, schoolProfileRouter } from './profile'
import segmentsRouter from './segments'
import { resolveSchoolSlug } from '../middlewares/school'

export default function setupRoutes(router: Router) {
  router.use('/health', healthRouter)
  router.use('/profile', publicProfileRouter)

  router
    .use(resolveSchoolSlug)
    .use('/tracks', tracksRouter)
    .use('/chapters', chaptersRouter)
    .use('/profile', schoolProfileRouter)
    .use('/chapters/:chapterId/segments', segmentsRouter)
}
