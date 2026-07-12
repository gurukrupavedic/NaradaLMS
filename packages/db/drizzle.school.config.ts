import '@narada/env/load'
import { env } from '@narada/env'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/school.ts',
  out: './drizzle/school',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
})
