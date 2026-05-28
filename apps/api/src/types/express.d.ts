import type { SchoolContext } from '../middlewares/school'
import type { Database } from '@narada/db'

declare global {
  namespace Express {
    interface Locals {
      school?: SchoolContext
      db: Database
    }
  }
}
