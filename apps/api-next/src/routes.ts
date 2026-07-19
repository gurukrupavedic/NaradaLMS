import { rateLimit } from 'express-rate-limit'
import type { Router } from 'express'

import batchesRouter from './batches'
import examsRouter from './exams'
import healthRouter from './health'
import profilesRouter from './profiles'

const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

export default function setupRoutes(router: Router) {
  router
    .use('/health', healthRouter)
    .use(apiRateLimit)
    .use('/profiles', profilesRouter)
    .use('/batches', batchesRouter)
    .use('/exams', examsRouter)
}
