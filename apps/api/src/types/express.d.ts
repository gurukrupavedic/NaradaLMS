import type { School } from '../middlewares/school'
import type { Database } from '@narada/db'
import type AuthClient from '../utils/auth'

declare global {
  namespace Express {
    interface Locals {
      school?: School
      db: Database
      authClient: AuthClient
    }
  }
}
