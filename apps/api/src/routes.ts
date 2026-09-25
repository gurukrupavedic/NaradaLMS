import { rateLimit } from 'express-rate-limit'
import type { Router } from 'express'

import batchesRouter from './batches'
import chaptersRouter from './chapters'
import coursesRouter, { myCoursesRouter } from './courses'
import dashboardRouter from './dashboard'
import enrollmentRouter from './enrollment'
import enrollmentRequestsRouter from './enrollmentRequests'
import evaluationsRouter from './evaluations'
import examsRouter from './exams'
import examSlotsRouter from './examSlots'
import healthRouter from './health'
import japamRouter from './japam'
import profileRouter from './profile'
import profilesRouter from './profiles'
import registrationsRouter from './registrations'
import schoolsRouter from './schools'
import tracksRouter from './tracks'

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
    .use('/profile', profileRouter)
    .use('/me/dashboard', dashboardRouter)
    .use('/me/courses', myCoursesRouter)
    .use('/schools', schoolsRouter)
    .use('/profiles', profilesRouter)
    .use('/profiles/:profileId/japam', japamRouter)
    .use('/registrations', registrationsRouter)
    .use('/enrollment-requests', enrollmentRequestsRouter)
    .use('/courses', coursesRouter)
    .use('/tracks', tracksRouter)
    .use('/chapters', chaptersRouter)
    .use('/batches', batchesRouter)
    .use('/batches/:batchId/members', enrollmentRouter)
    .use('/batches/:batchId/evaluations', evaluationsRouter)
    .use('/exams', examsRouter)
    .use('/exam-slots', examSlotsRouter)
}
