import { Express } from 'express'

import healthRouter from './health'

export default function setupRoutes(app: Express) {
  app.use('/v1/health', healthRouter)
}
