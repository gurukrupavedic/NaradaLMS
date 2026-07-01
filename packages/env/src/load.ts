import { config } from 'dotenv'

// In production, variables are injected by the platform
// and therefore, no .env file is needed.
if (process.env.NODE_ENV !== 'production') {
  config({ path: new URL('../.env', import.meta.url), quiet: true })
}
