import { Redis } from 'ioredis'

import { env } from '@narada/env'

/**
 * One shared connection for the whole process — mirrors `packages/storage`'s single `s3` client.
 * Backs BullMQ today; also the connection a future rate limiter/cache would reuse.
 *
 * `maxRetriesPerRequest: null` is required by BullMQ: it issues blocking commands that must block
 * indefinitely, not fail after ioredis's own retry budget runs out.
 */
export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })

redis.on('error', error => {
  console.error('redis connection error', { message: error.message })
})
