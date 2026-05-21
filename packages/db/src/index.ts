import { drizzle } from 'drizzle-orm/node-postgres'

import { env } from '@narada/env'
import * as schema from './schema'

export const db = drizzle(env.DATABASE_URL, { schema })
export * from './schema'
