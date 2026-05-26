import type { School } from '../middlewares/school'
import type { Database } from '@narada/db'

declare global {
  namespace Express {
    interface Locals {
      school?: School
      db: Database
    }
  }
}
